from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from models.product import ProductCreate, ProductUpdate, ProductResponse, doc_to_product
from services.inventory import InventoryService
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/products", tags=["products"])


class ArchiveResponse(BaseModel):
    success: bool
    message: str
    productId: str


def get_inventory_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("", response_model=list[ProductResponse])
async def list_products(svc: InventoryService = Depends(get_inventory_service)):
    return await svc.get_all_products()


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, svc: InventoryService = Depends(get_inventory_service)):
    product = await svc.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    data: ProductCreate,
    svc: InventoryService = Depends(get_inventory_service),
):
    return await svc.create_product(data.model_dump())


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    svc: InventoryService = Depends(get_inventory_service),
):
    updated = await svc.update_product(product_id, data.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated


@router.delete("/{product_id}", response_model=ArchiveResponse)
async def archive_product(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Soft-delete (archive) a product.
    Sets status=archived so it no longer appears in active inventory.
    Transaction history is fully preserved.
    """
    doc = await db.products.find_one({"_id": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    if doc.get("status") == "archived":
        raise HTTPException(status_code=409, detail="Product is already archived")

    await db.products.update_one(
        {"_id": product_id},
        {"$set": {"status": "archived", "updatedAt": datetime.now(timezone.utc).isoformat()}},
    )
    return ArchiveResponse(
        success=True,
        message=f"{doc['name']} removed from active inventory.",
        productId=product_id,
    )
