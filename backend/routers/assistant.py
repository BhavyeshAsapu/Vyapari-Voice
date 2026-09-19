"""
Assistant router — real-time Gemini-powered Q&A using live inventory data.
AI answers are grounded in actual MongoDB data; it cannot invent quantities.
"""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService
from google import genai
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assistant", tags=["assistant"])

# Lazy singleton — initialized on first use, not at import time
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return or create the Gemini client. Raises HTTPException if key is not set."""
    global _client
    if _client is not None:
        return _client
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "AI_AUTHENTICATION_FAILED",
                "message": "AI service authentication failed. Check the Gemini API key configuration.",
            },
        )
    _client = genai.Client(api_key=settings.gemini_api_key)
    logger.info(f"✅ Assistant model initialized: {settings.gemini_model}")
    return _client


class AssistantQueryRequest(BaseModel):
    question: str
    history: list[dict] = []
    language: str = "english"


class AssistantMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


@router.get("/health")
async def assistant_health():
    """
    Development health check for Gemini AI integration.
    Returns configuration status without exposing the key.
    """
    configured = bool(settings.gemini_api_key)
    if not configured:
        return {
            "configured": False,
            "provider": "gemini",
            "model": settings.gemini_model,
            "status": "not_configured",
        }

    try:
        # Quick ping: generate a one-token response
        client = genai.Client(api_key=settings.gemini_api_key)
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents="Reply with exactly: OK",
            config=genai.types.GenerateContentConfig(max_output_tokens=4, temperature=0),
        )
        _ = response.text  # Access to trigger any auth errors
        return {
            "configured": True,
            "provider": "gemini",
            "model": settings.gemini_model,
            "status": "healthy",
        }
    except Exception as e:
        err_str = str(e)
        status = "authentication_failed" if "API_KEY_INVALID" in err_str or "invalid" in err_str.lower() else "error"
        return {
            "configured": True,
            "provider": "gemini",
            "model": settings.gemini_model,
            "status": status,
        }


@router.post("/query", response_model=AssistantMessage)
async def query_assistant(
    req: AssistantQueryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    client = _get_client()
    svc = InventoryService(db)

    # Gather live inventory context
    products = await svc.get_all_products()
    alerts = await svc.get_alerts()
    today_txs = await svc.get_today_transactions()

    # Build concise context (do NOT send entire product objects — keep tokens low)
    inventory_context = [
        {
            "name": p.name,
            "brand": p.brand,
            "stock": p.currentStock,
            "unit": p.unit,
            "reorderLevel": p.reorderLevel,
            "status": "out" if p.currentStock == 0 else ("low" if p.currentStock <= p.reorderLevel else "ok"),
            "expiryDate": p.expiryDate,
        }
        for p in products
    ]

    # Daily summary (always compute — cheap DB query, might be needed)
    daily_summary = await svc.get_daily_inventory_summary()
    expiry_alerts = await svc.get_expiry_alerts()

    context_prompt = f"""
Current inventory (live data from database):
{inventory_context}

Alerts: {[a['productName'] + ' - ' + a['type'] for a in alerts]}

Today's stock movements (per-product):
{daily_summary['products']}

Totals today — Stock In transactions: {daily_summary['totals']['stockInTransactions']}, Stock Out transactions: {daily_summary['totals']['stockOutTransactions']}

Expiry alerts: {[{'product': a['productName'], 'type': a['type'], 'expiryDate': a.get('expiryDate'), 'daysUntilExpiry': a.get('daysUntilExpiry')} for a in expiry_alerts]}

Today's transactions: {[f"{t.productName} {'+' if t.type=='stock_in' else '-'}{t.quantity} {t.unit}" for t in today_txs]}

User language/style: {req.language}
User question: {req.question}

IMPORTANT: Never invent quantities, expiry dates, or product names not in the data above. Use ONLY the data provided.
"""

    # Build conversation history for Gemini
    history = []
    for msg in req.history[-6:]:  # Last 3 turns for context
        role = "user" if msg.get("role") == "user" else "model"
        history.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
        
    system_instruction = """
You are Vyapari Voice — an AI assistant for an Indian kirana shop owner.
Answer questions about their inventory based ONLY on the data provided.
Keep responses SHORT (2-4 sentences max) and conversational.
Use simple mixed language if the user writes in Telugu or Hindi mixed with English.
Never invent product quantities, prices, or product names not in the data.
If data is empty for a category, say so honestly.
"""

    try:
        chat = client.aio.chats.create(
            model=settings.gemini_model,
            config=genai.types.GenerateContentConfig(system_instruction=system_instruction),
            history=history
        )
        response = await chat.send_message(context_prompt)
        answer = response.text.strip()
    except Exception as e:
        err_str = str(e)
        logger.error(f"Assistant query failed: {e}")
        if "API_KEY_INVALID" in err_str or "invalid" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "AI_AUTHENTICATION_FAILED",
                    "message": "AI service authentication failed. Check the Gemini API key configuration.",
                },
            )
        raise HTTPException(status_code=503, detail="Assistant unavailable. Please try again.")

    return AssistantMessage(
        id=f"msg{uuid.uuid4().hex[:8]}",
        role="assistant",
        content=answer,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
