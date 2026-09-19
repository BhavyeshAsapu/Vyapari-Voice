"""
Assistant router — real-time Gemini-powered Q&A using live inventory data.
AI answers are grounded in actual MongoDB data; it cannot invent quantities.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assistant", tags=["assistant"])

genai.configure(api_key=settings.gemini_api_key)
_MODEL = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction="""
You are Vyapari Voice — an AI assistant for an Indian kirana shop owner.
Answer questions about their inventory based ONLY on the data provided.
Keep responses SHORT (2-4 sentences max) and conversational.
Use simple mixed language if the user writes in Telugu or Hindi mixed with English.
Never invent product quantities, prices, or product names not in the data.
If data is empty for a category, say so honestly.
""",
)


class AssistantQueryRequest(BaseModel):
    question: str
    history: list[dict] = []
    language: str = "english"


class AssistantMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


@router.post("/query", response_model=AssistantMessage)
async def query_assistant(
    req: AssistantQueryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
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
        }
        for p in products
    ]

    context_prompt = f"""
Current inventory (live data from database):
{inventory_context}

Alerts: {[a['productName'] + ' - ' + a['type'] for a in alerts]}

Today's transactions: {[f"{t.productName} {'+' if t.type=='stock_in' else '-'}{t.quantity} {t.unit}" for t in today_txs]}

User language/style: {req.language}
User question: {req.question}
"""

    # Build conversation history for Gemini
    history = []
    for msg in req.history[-6:]:  # Last 3 turns for context
        role = "user" if msg.get("role") == "user" else "model"
        history.append({"role": role, "parts": [msg.get("content", "")]})

    try:
        chat = _MODEL.start_chat(history=history)
        response = await chat.send_message_async(context_prompt)
        answer = response.text.strip()
    except Exception as e:
        logger.error(f"Assistant query failed: {e}")
        raise HTTPException(status_code=503, detail="Assistant unavailable. Please try again.")

    from datetime import datetime, timezone
    import uuid
    return AssistantMessage(
        id=f"msg{uuid.uuid4().hex[:8]}",
        role="assistant",
        content=answer,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
