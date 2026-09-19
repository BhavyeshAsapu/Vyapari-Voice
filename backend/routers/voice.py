"""
Voice API Router — the core AI-powered pipeline.

POST /api/voice/parse
  1. Receive raw transcript + sessionId
  2. AI interpreter → InventoryIntent
  3. Product search → ProductMatch
  4. Build ProposedAction
  5. Store pending session
  6. Return VoiceParseResponse

POST /api/voice/confirm
  1. Retrieve pending session by sessionId
  2. Re-validate everything server-side
  3. Execute DB transaction
  4. Return success/failure

The frontend never sends raw stock values to confirm.
All values come from the server-validated pending session.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from models.voice import (
    VoiceParseRequest, VoiceParseResponse, VoiceConfirmRequest, VoiceConfirmResponse,
    InventoryIntent, ProductMatch, ProposedAction,
)
from models.transaction import TransactionCreate
from services.ai_interpreter import AIInventoryInterpreter
from services.product_search import ProductSearchService
from services.inventory import InventoryService, InsufficientStockError
from services.session_store import (
    PendingSession, store_session, get_session, mark_confirmed, clear_session
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"])

# Singleton AI interpreter (reuses connection pool)
_ai = AIInventoryInterpreter()

QUERY_INTENTS = {
    "CHECK_STOCK", "LOW_STOCK_QUERY", "OUT_OF_STOCK_QUERY",
    "REORDER_QUERY", "TRANSACTION_HISTORY_QUERY", "FAST_SELLING_QUERY",
}


def get_db_dep(db: AsyncIOMotorDatabase = Depends(get_db)) -> AsyncIOMotorDatabase:
    return db


@router.post("/parse", response_model=VoiceParseResponse)
async def parse_voice(
    req: VoiceParseRequest,
    db: AsyncIOMotorDatabase = Depends(get_db_dep),
):
    """
    Full voice interpretation pipeline.
    Returns a structured response for the frontend to display.
    """
    search_svc = ProductSearchService(db)
    inventory_svc = InventoryService(db)

    # Check if there's an existing pending session (for corrections)
    existing_session = get_session(req.sessionId)
    pending_context = None
    if existing_session and not existing_session.confirmed:
        pending_context = {
            "productName": existing_session.intent.productName,
            "quantity": existing_session.intent.quantity,
            "unit": existing_session.intent.unit,
            "transactionType": existing_session.intent.transactionType,
        }

    # Step 1: AI interpretation
    try:
        intent = await _ai.interpret_command(
            transcript=req.transcript,
            language_hint=req.language,
            pending_context=pending_context,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"AI interpretation failed: {e}")

    # Step 2: Handle query intents (no DB write needed, just answer)
    if intent.intent in QUERY_INTENTS or intent.intent == "UNDO_LAST_TRANSACTION":
        query_answer, proposed_action = await _handle_query_intent(
            intent, inventory_svc, req.language or "english"
        )
        return VoiceParseResponse(
            transcript=req.transcript,
            interpretation=intent,
            productMatch=ProductMatch(status="MATCHED"),
            proposedAction=proposed_action,
            requiresConfirmation=(intent.intent == "UNDO_LAST_TRANSACTION"),
            queryAnswer=query_answer,
        )

    # Step 3: Clarification required?
    if intent.needsClarification or intent.intent == "UNKNOWN":
        return VoiceParseResponse(
            transcript=req.transcript,
            interpretation=intent,
            productMatch=ProductMatch(status="NOT_FOUND"),
            proposedAction=ProposedAction(type="CLARIFICATION"),
            requiresConfirmation=False,
            queryAnswer=intent.clarificationQuestion or "Could you please clarify?",
        )

    # Step 4: Product search
    product_match = await search_svc.search(
        product_name=intent.productName or "",
        brand=intent.brand,
        category=intent.category,
        aliases=intent.possibleAliases,
    )

    # Step 5: Build proposed action
    if product_match.status == "NOT_FOUND":
        # Propose new product creation
        proposed_action = ProposedAction(
            type="CREATE_PRODUCT",
            productName=intent.productName,
            change=intent.quantity,
            unit=intent.unit or "Pieces",
            proposedProduct={
                "name": intent.productName,
                "brand": intent.brand,
                "category": intent.category or "Other",
                "unit": intent.unit or "Pieces",
                "openingStock": int(intent.quantity or 0),
                "currentStock": int(intent.quantity or 0),
            },
        )
        proposed = VoiceParseResponse(
            transcript=req.transcript,
            interpretation=intent,
            productMatch=product_match,
            proposedAction=proposed_action,
            requiresConfirmation=True,
            queryAnswer=f"I couldn't find {intent.productName} in your inventory. Create it as a new product?",
        )
        # Store session for confirmation
        _store_parse_session(req.sessionId, intent, product_match, proposed_action)
        return proposed

    if product_match.status == "AMBIGUOUS":
        return VoiceParseResponse(
            transcript=req.transcript,
            interpretation=intent,
            productMatch=product_match,
            proposedAction=ProposedAction(type="CLARIFICATION"),
            requiresConfirmation=False,
            queryAnswer="Which product do you mean?",
        )

    # MATCHED — build STOCK_IN / STOCK_OUT action
    tx_type = intent.transactionType or ("STOCK_IN" if intent.intent == "STOCK_IN" else "STOCK_OUT")
    current = product_match.currentStock or 0
    change = intent.quantity or 0
    result = current + change if tx_type == "STOCK_IN" else current - change

    proposed_action = ProposedAction(
        type=tx_type,
        productId=product_match.productId,
        productName=product_match.name,
        currentQuantity=current,
        change=change,
        resultQuantity=result,
        unit=product_match.unit or intent.unit,
        price=intent.price,
    )

    # Store session for confirm step
    _store_parse_session(req.sessionId, intent, product_match, proposed_action)

    return VoiceParseResponse(
        transcript=req.transcript,
        interpretation=intent,
        productMatch=product_match,
        proposedAction=proposed_action,
        requiresConfirmation=True,
    )


@router.post("/confirm", response_model=VoiceConfirmResponse)
async def confirm_voice(
    req: VoiceConfirmRequest,
    db: AsyncIOMotorDatabase = Depends(get_db_dep),
):
    """
    Execute a stored pending voice action after user confirmation.
    Re-validates everything server-side — frontend cannot inject values.
    """
    session = get_session(req.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired. Please try again.")

    if session.is_duplicate_confirm():
        return VoiceConfirmResponse(
            success=True,
            message="Already confirmed.",
            transactionId=session.transaction_id,
        )

    inventory_svc = InventoryService(db)
    action = session.proposed_action
    intent = session.intent

    try:
        if action.type == "CREATE_PRODUCT":
            # Create product + opening STOCK_IN transaction
            proposed = action.proposedProduct or {}
            product = await inventory_svc.create_product(proposed)
            tx = await inventory_svc.create_transaction(TransactionCreate(
                productId=product.id,
                productName=product.name,
                quantity=float(action.change or 0),
                unit=action.unit or product.unit,
                type="stock_in",
                source="voice",
                note=f"New product created via voice",
            ))
            mark_confirmed(req.sessionId, tx.id)
            return VoiceConfirmResponse(
                success=True,
                message=f"{product.name} created and {action.change} {action.unit} added.",
                transactionId=tx.id,
                productId=product.id,
                newStock=product.currentStock,
            )

        elif action.type in ("STOCK_IN", "STOCK_OUT"):
            # Re-fetch current stock from DB (do NOT trust session value — stock may have changed)
            current_product = await inventory_svc.get_product(action.productId or "")
            if not current_product:
                raise HTTPException(status_code=404, detail="Product no longer exists.")

            tx_type_lower = "stock_in" if action.type == "STOCK_IN" else "stock_out"

            tx = await inventory_svc.create_transaction(TransactionCreate(
                productId=current_product.id,
                productName=current_product.name,
                quantity=float(action.change or 0),
                unit=action.unit or current_product.unit,
                type=tx_type_lower,
                source="voice",
                note=session.intent.possibleAliases[0] if session.intent.possibleAliases else None,
                price=action.price,
            ))

            new_stock = (
                current_product.currentStock + float(action.change or 0)
                if tx_type_lower == "stock_in"
                else current_product.currentStock - float(action.change or 0)
            )

            mark_confirmed(req.sessionId, tx.id)
            return VoiceConfirmResponse(
                success=True,
                message=f"{current_product.name} updated. New stock: {new_stock} {current_product.unit}.",
                transactionId=tx.id,
                productId=current_product.id,
                newStock=new_stock,
            )

        elif action.type == "UNDO":
            original_tx_id = action.proposedProduct.get("transactionId") if action.proposedProduct else None
            if not original_tx_id:
                raise HTTPException(status_code=400, detail="No transaction to undo.")
            undo_tx = await inventory_svc.execute_undo(original_tx_id)
            mark_confirmed(req.sessionId, undo_tx.id)
            return VoiceConfirmResponse(
                success=True,
                message="Transaction undone successfully.",
                transactionId=undo_tx.id,
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action type: {action.type}")

    except InsufficientStockError as e:
        clear_session(req.sessionId)
        raise HTTPException(
            status_code=409,
            detail=f"Only {e.available} {e.unit} of {e.product_name} available."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Confirm failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update inventory: {e}")


async def _handle_query_intent(
    intent: InventoryIntent,
    svc: InventoryService,
    language: str,
) -> tuple[str, ProposedAction]:
    """Handle read-only query intents — fetch real data, generate natural response."""
    ai = _ai

    if intent.intent == "CHECK_STOCK":
        products = await svc.get_all_products()
        name = intent.productName or ""
        matches = [p for p in products if name.lower() in p.name.lower() or p.name.lower() in name.lower()]
        if matches:
            p = matches[0]
            answer = await ai.generate_query_response(
                intent, {"product": {"name": p.name, "currentStock": p.currentStock, "unit": p.unit}}, language
            )
        else:
            answer = f"I couldn't find {name} in your inventory."
        return answer, ProposedAction(type="QUERY")

    elif intent.intent == "LOW_STOCK_QUERY":
        products = await svc.get_all_products()
        low = [{"name": p.name, "currentStock": p.currentStock, "unit": p.unit, "reorderLevel": p.reorderLevel}
               for p in products if 0 < p.currentStock <= p.reorderLevel]
        answer = await ai.generate_query_response(intent, {"items": low}, language)
        return answer, ProposedAction(type="QUERY")

    elif intent.intent == "OUT_OF_STOCK_QUERY":
        products = await svc.get_all_products()
        oos = [{"name": p.name, "unit": p.unit} for p in products if p.currentStock == 0]
        answer = await ai.generate_query_response(intent, {"items": oos}, language)
        return answer, ProposedAction(type="QUERY")

    elif intent.intent == "REORDER_QUERY":
        products = await svc.get_all_products()
        reorder = [{"name": p.name, "currentStock": p.currentStock, "reorderLevel": p.reorderLevel, "unit": p.unit}
                   for p in products if p.currentStock <= p.reorderLevel]
        answer = await ai.generate_query_response(intent, {"items": reorder}, language)
        return answer, ProposedAction(type="QUERY")

    elif intent.intent == "FAST_SELLING_QUERY":
        items = await svc.get_fast_selling(days=7)
        answer = await ai.generate_query_response(intent, {"items": items[:5]}, language)
        return answer, ProposedAction(type="QUERY")

    elif intent.intent == "UNDO_LAST_TRANSACTION":
        last = await svc.undo_last_transaction()
        if not last:
            return "No recent transactions to undo.", ProposedAction(type="QUERY")
        action = ProposedAction(
            type="UNDO",
            productId=last.productId,
            productName=last.productName,
            change=last.quantity,
            unit=last.unit,
            proposedProduct={"transactionId": last.id, "originalType": last.type},
        )
        answer = f"Undo: {last.productName} {'+ ' if last.type=='stock_in' else '- '}{last.quantity} {last.unit}?"
        return answer, action

    return "Done!", ProposedAction(type="QUERY")


def _store_parse_session(
    session_id: str,
    intent: InventoryIntent,
    product_match: ProductMatch,
    proposed_action: ProposedAction,
) -> None:
    session = PendingSession(
        session_id=session_id,
        intent=intent,
        product_match=product_match,
        proposed_action=proposed_action,
    )
    store_session(session)
