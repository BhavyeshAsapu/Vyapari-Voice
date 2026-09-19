from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def get_svc(db: AsyncIOMotorDatabase = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("")
async def get_inventory(svc: InventoryService = Depends(get_svc)):
    products = await svc.get_all_products()
    result = []
    for p in products:
        status = "healthy"
        if p.currentStock == 0:
            status = "out"
        elif p.currentStock <= p.reorderLevel:
            status = "low"
        elif p.capacity and p.currentStock > p.capacity:
            status = "over_capacity"
        elif p.capacity and p.currentStock >= p.capacity * 0.9:
            status = "near_capacity"
        result.append({**p.model_dump(), "status": status})
    return result


@router.get("/alerts")
async def get_alerts(svc: InventoryService = Depends(get_svc)):
    return await svc.get_alerts()
