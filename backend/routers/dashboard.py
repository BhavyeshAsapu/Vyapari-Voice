from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_svc(db: AsyncIOMotorDatabase = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("/summary")
async def daily_summary(svc: InventoryService = Depends(get_svc)):
    return await svc.get_daily_summary()


@router.get("/fast-selling")
async def fast_selling(
    period: str = "7days",
    svc: InventoryService = Depends(get_svc),
):
    days_map = {"today": 1, "7days": 7, "30days": 30}
    days = days_map.get(period, 7)
    return await svc.get_fast_selling(days=days)
