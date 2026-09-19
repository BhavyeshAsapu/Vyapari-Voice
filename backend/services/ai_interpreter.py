"""
AIInventoryInterpreter — wraps Google Gemini to return strictly structured
InventoryIntent objects from raw natural-language transcripts.

Design principles:
- AI only interprets language. It does NOT touch the database.
- All output is validated by Pydantic before use.
- Any validation failure results in a recoverable error, never a DB write.
- API key stays on the backend; never shipped to the browser.
"""
import json
import logging
from typing import Optional
import google.generativeai as genai
from models.voice import InventoryIntent
from config import settings

logger = logging.getLogger(__name__)

# Configure Gemini once at import time
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
else:
    logger.warning("⚠️  GEMINI_API_KEY not set. AI features will not work until it is configured in backend/.env")

# Use flash for speed; switch to pro for higher accuracy if needed
_MODEL_NAME = "gemini-1.5-flash"

_SYSTEM_PROMPT = """
You are an AI inventory assistant for an Indian kirana (general store) shop management app called Vyapari Voice.

Your job is to interpret the shop owner's natural speech — which may be in English, Telugu, Hindi, or any mix of these — and extract structured inventory intent.

You MUST respond with a valid JSON object matching the schema below. Do NOT add prose, markdown, or explanation. Output ONLY the JSON.

JSON Schema:
{
  "intent": "<one of: STOCK_IN | STOCK_OUT | CREATE_PRODUCT | CHECK_STOCK | LOW_STOCK_QUERY | OUT_OF_STOCK_QUERY | REORDER_QUERY | TRANSACTION_HISTORY_QUERY | FAST_SELLING_QUERY | UNDO_LAST_TRANSACTION | UNKNOWN>",
  "language": "<e.g. english | telugu | hindi | mixed_telugu_english | mixed_hindi_english>",
  "productName": "<product name in English, or null>",
  "brand": "<brand name if clearly stated, or null>",
  "category": "<inferred category, or null>",
  "quantity": <number or null>,
  "unit": "<one of: Pieces | KG | Grams | Litres | Millilitres | Bags | Cartons | Boxes | Dozens | Quintals | Packets, or null>",
  "price": <number or null>,
  "priceType": "<PER_UNIT | TOTAL | UNKNOWN, or null>",
  "transactionType": "<STOCK_IN | STOCK_OUT, or null>",
  "possibleAliases": ["<alias1>", "<alias2>"],
  "confidence": <0.0 to 1.0>,
  "needsClarification": <true | false>,
  "clarificationQuestion": "<question to ask user, or null>"
}

Rules:
1. "vachayi", "vachindi", "aaya", "aaye", "received", "came", "add" → STOCK_IN
2. "ammamu", "ammindi", "sold", "becha", "remove", "poyindi" → STOCK_OUT
3. "entha undi", "kitna", "how much", "check" → CHECK_STOCK
4. "low stock", "low items", "cheppu" → LOW_STOCK_QUERY
5. "out of stock", "khatam" → OUT_OF_STOCK_QUERY
6. "order", "reorder", "what to buy" → REORDER_QUERY
7. "fast selling", "what is selling" → FAST_SELLING_QUERY
8. "undo", "cancel last" → UNDO_LAST_TRANSACTION
9. "Biyyam" = Rice (Telugu). "Cheeni" = Sugar. "Uppu" = Salt. "Nune" = Oil. "Kandi Pappu" = Toor Dal.
10. If quantity is missing for STOCK_IN/STOCK_OUT, set needsClarification=true and clarificationQuestion="How many <unit> of <product>?"
11. If unit is ambiguous (e.g. just a number), set needsClarification=true.
12. If product is completely unclear, set intent=UNKNOWN and needsClarification=true.
13. For price: if a number clearly follows "rupees", "rs", "₹", "per kg", extract it. If ambiguous, set needsClarification=true.
14. Do NOT invent product names. Use what the user said or a reasonable English translation.
15. confidence should reflect how certain you are (0.0 = wild guess, 1.0 = crystal clear).
"""


class AIInventoryInterpreter:
    """Interprets free-form inventory speech into structured InventoryIntent."""

    def __init__(self):
        self._model = genai.GenerativeModel(
            model_name=_MODEL_NAME,
            system_instruction=_SYSTEM_PROMPT,
        )

    async def interpret_command(
        self,
        transcript: str,
        language_hint: Optional[str] = None,
        pending_context: Optional[dict] = None,
    ) -> InventoryIntent:
        """
        Interpret a voice transcript into a structured InventoryIntent.

        Args:
            transcript: Raw speech-to-text output
            language_hint: Optional language hint from STT (e.g. "te-IN")
            pending_context: Current pending action for correction context

        Returns:
            Validated InventoryIntent

        Raises:
            ValueError: If AI response fails Pydantic validation
            RuntimeError: If AI call fails entirely
        """
        prompt_parts = [f'Transcript: "{transcript}"']

        if language_hint:
            prompt_parts.append(f"Language hint from speech recognizer: {language_hint}")

        if pending_context:
            prompt_parts.append(
                f"Context: The user has a pending action: {json.dumps(pending_context)}. "
                "This may be a correction — adjust the pending action accordingly."
            )

        prompt = "\n".join(prompt_parts)

        try:
            response = await self._model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,  # Low temperature for consistency
                    max_output_tokens=512,
                ),
            )
            raw_text = response.text.strip()
            logger.debug(f"AI raw output: {raw_text}")
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise RuntimeError(f"AI service unavailable: {e}") from e

        # Parse and validate with Pydantic
        try:
            data = json.loads(raw_text)
            intent = InventoryIntent(**data)
            logger.info(
                f"Intent: {intent.intent} | Product: {intent.productName} "
                f"| Qty: {intent.quantity} {intent.unit} | Confidence: {intent.confidence}"
            )
            return intent
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"AI response validation failed: {e}\nRaw: {raw_text}")
            raise ValueError(f"AI returned invalid structured output: {e}") from e

    async def generate_query_response(
        self,
        intent: InventoryIntent,
        data: dict,
        language_hint: str = "english",
    ) -> str:
        """
        Generate a natural-language response for query intents (CHECK_STOCK, etc.)
        using actual backend data.

        The AI formats the response; it does NOT invent numbers or products.
        All values come from `data` — the backend result.
        """
        prompt = f"""
You are a friendly inventory assistant for an Indian kirana shop.
Generate a SHORT, natural response (1-3 sentences max) to the following query result.
Respond in the same language as: {language_hint}
If mixed Telugu-English, use simple conversational style.
Do NOT add extra advice, warnings, or long explanations.

Query intent: {intent.intent}
Data from database: {json.dumps(data, ensure_ascii=False)}

Examples:
- CHECK_STOCK English: "You have 33 bags of Rice."
- CHECK_STOCK Telugu: "Rice stock 33 bags undi."
- LOW_STOCK_QUERY: List the products naturally.
- OUT_OF_STOCK_QUERY: List what's out of stock.
"""
        try:
            response = await self._model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=200,
                ),
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            # Fall back to simple English
            return _build_fallback_response(intent, data)


def _build_fallback_response(intent: InventoryIntent, data: dict) -> str:
    """Simple deterministic fallback when AI response generation fails."""
    if intent.intent == "CHECK_STOCK":
        p = data.get("product", {})
        return f"You have {p.get('currentStock', '?')} {p.get('unit', '')} of {p.get('name', 'that product')}."
    if intent.intent == "LOW_STOCK_QUERY":
        items = data.get("items", [])
        if not items:
            return "All products are well stocked!"
        names = ", ".join(i["name"] for i in items)
        return f"{len(items)} products are low on stock: {names}."
    if intent.intent == "OUT_OF_STOCK_QUERY":
        items = data.get("items", [])
        if not items:
            return "No products are out of stock!"
        names = ", ".join(i["name"] for i in items)
        return f"Out of stock: {names}."
    return "Done!"
