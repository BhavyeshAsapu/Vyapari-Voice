from pydantic import BaseModel, Field
from typing import Optional


class TransactionCreate(BaseModel):
    productId: str
    productName: str
    quantity: float
    unit: str
    type: str  # "stock_in" | "stock_out"
    source: str = "voice"  # "voice" | "manual"
    note: Optional[str] = None
    price: Optional[float] = None


class TransactionResponse(BaseModel):
    id: str
    productId: str
    productName: str
    quantity: float
    unit: str
    type: str
    source: str
    note: Optional[str] = None
    price: Optional[float] = None
    timestamp: str


def doc_to_transaction(doc: dict) -> TransactionResponse:
    return TransactionResponse(
        id=str(doc["_id"]),
        productId=doc["productId"],
        productName=doc["productName"],
        quantity=doc["quantity"],
        unit=doc["unit"],
        type=doc["type"],
        source=doc.get("source", "manual"),
        note=doc.get("note"),
        price=doc.get("price"),
        timestamp=doc.get("timestamp", ""),
    )
