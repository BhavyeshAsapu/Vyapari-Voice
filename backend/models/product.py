from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


VALID_UNITS = ["Pieces", "KG", "Grams", "Litres", "Millilitres",
               "Bags", "Cartons", "Boxes", "Dozens", "Quintals", "Packets"]

VALID_CATEGORIES = [
    "Grains & Rice", "Pulses & Lentils", "Spices", "Oils & Ghee",
    "Biscuits & Snacks", "Soaps & Detergents", "Beverages", "Dairy",
    "Sugar & Salt", "Other"
]


class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    category: str = "Other"
    unit: str = "Pieces"
    reorderLevel: int = 5
    capacity: Optional[int] = None
    purchasePrice: float = 0
    sellingPrice: float = 0
    aliases: list[str] = Field(default_factory=list)
    # Expiry tracking — optional for all products
    expiryDate: Optional[str] = None     # ISO date string "YYYY-MM-DD"
    expiryTracked: bool = False           # True when user opted in to expiry tracking


class ProductCreate(ProductBase):
    openingStock: int = 0
    currentStock: Optional[int] = None

    def model_post_init(self, __context):
        if self.currentStock is None:
            self.currentStock = self.openingStock


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    reorderLevel: Optional[int] = None
    capacity: Optional[int] = None
    purchasePrice: Optional[float] = None
    sellingPrice: Optional[float] = None
    aliases: Optional[list[str]] = None
    # Expiry updates
    expiryDate: Optional[str] = None
    expiryTracked: Optional[bool] = None


class ProductInDB(ProductBase):
    id: str = Field(alias="_id")
    currentStock: int = 0
    openingStock: int = 0
    createdAt: str
    updatedAt: str

    model_config = {"populate_by_name": True}


class ProductResponse(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    category: str
    unit: str
    currentStock: int
    openingStock: int
    reorderLevel: int
    capacity: Optional[int] = None
    purchasePrice: float
    sellingPrice: float
    aliases: list[str] = []
    createdAt: str
    updatedAt: str
    # Expiry fields — None for products without tracking
    expiryDate: Optional[str] = None
    expiryTracked: bool = False


def doc_to_product(doc: dict) -> ProductResponse:
    return ProductResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        brand=doc.get("brand"),
        category=doc.get("category", "Other"),
        unit=doc.get("unit", "Pieces"),
        currentStock=doc.get("currentStock", 0),
        openingStock=doc.get("openingStock", 0),
        reorderLevel=doc.get("reorderLevel", 5),
        capacity=doc.get("capacity"),
        purchasePrice=doc.get("purchasePrice", 0),
        sellingPrice=doc.get("sellingPrice", 0),
        aliases=doc.get("aliases", []),
        createdAt=doc.get("createdAt", ""),
        updatedAt=doc.get("updatedAt", ""),
        expiryDate=doc.get("expiryDate"),
        expiryTracked=doc.get("expiryTracked", False),
    )
