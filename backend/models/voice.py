"""
Voice pipeline Pydantic models.

InventoryIntent — the strict structured output from the AI interpreter.
VoiceParseRequest / VoiceParseResponse — the /api/voice/parse contract.
VoiceConfirmRequest — the /api/voice/confirm contract.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


# ── Intent types ──────────────────────────────────────────────────────────────

IntentType = Literal[
    "STOCK_IN",
    "STOCK_OUT",
    "CREATE_PRODUCT",
    "CHECK_STOCK",
    "LOW_STOCK_QUERY",
    "OUT_OF_STOCK_QUERY",
    "REORDER_QUERY",
    "TRANSACTION_HISTORY_QUERY",
    "FAST_SELLING_QUERY",
    "UNDO_LAST_TRANSACTION",
    "UNKNOWN",
]

ProductMatchStatus = Literal["MATCHED", "AMBIGUOUS", "NOT_FOUND"]

PriceType = Literal["PER_UNIT", "TOTAL", "UNKNOWN"]


# ── AI Structured Output ───────────────────────────────────────────────────────

class InventoryIntent(BaseModel):
    """
    Strict structured output from the AI interpreter.
    All fields must be present; optional fields default to None.
    The backend validates this before any DB operation.
    """
    intent: IntentType
    language: str  # e.g. "english", "telugu", "hindi", "mixed_telugu_english"
    productName: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    priceType: Optional[PriceType] = None
    transactionType: Optional[Literal["STOCK_IN", "STOCK_OUT"]] = None
    possibleAliases: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    needsClarification: bool = False
    clarificationQuestion: Optional[str] = None

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, v))


# ── Product Match Result ───────────────────────────────────────────────────────

class ProductMatch(BaseModel):
    status: ProductMatchStatus
    productId: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    unit: Optional[str] = None
    currentStock: Optional[float] = None
    candidates: list[dict] = Field(default_factory=list)  # for AMBIGUOUS


# ── Proposed Action ───────────────────────────────────────────────────────────

class ProposedAction(BaseModel):
    type: str  # "STOCK_IN" | "STOCK_OUT" | "CREATE_PRODUCT" | "QUERY"
    productId: Optional[str] = None
    productName: Optional[str] = None
    currentQuantity: Optional[float] = None
    change: Optional[float] = None
    resultQuantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    # For CREATE_PRODUCT
    proposedProduct: Optional[dict] = None


# ── API Contracts ──────────────────────────────────────────────────────────────

class VoiceParseRequest(BaseModel):
    transcript: str
    sessionId: str
    language: Optional[str] = None  # hint from Web Speech API


class VoiceParseResponse(BaseModel):
    transcript: str
    interpretation: InventoryIntent
    productMatch: ProductMatch
    proposedAction: ProposedAction
    requiresConfirmation: bool
    # For query intents — the answer string goes here, no confirmation needed
    queryAnswer: Optional[str] = None


class VoiceConfirmRequest(BaseModel):
    sessionId: str


class VoiceConfirmResponse(BaseModel):
    success: bool
    message: str
    transactionId: Optional[str] = None
    productId: Optional[str] = None
    newStock: Optional[float] = None
