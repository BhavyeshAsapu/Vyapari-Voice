from fastapi import APIRouter, Depends
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_svc(db: AsyncIOMotorDatabase = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("/summary")
async def daily_summary(svc: InventoryService = Depends(get_svc)):
    return await svc.get_daily_summary()


@router.get("/daily-summary")
async def daily_inventory_summary(
    date: Optional[str] = None,
    svc: InventoryService = Depends(get_svc),
):
    """
    GET /api/dashboard/daily-summary?date=YYYY-MM-DD

    Returns per-product opening stock, stock in, stock out, and closing stock
    for the given date. Calculated from MongoDB transaction ledger — AI never
    touches these numbers.

    date: ISO date string (e.g. "2026-09-19"). Defaults to today in IST.
    """
    return await svc.get_daily_inventory_summary(date_str=date)


@router.get("/fast-selling")
async def fast_selling(
    period: str = "7days",
    svc: InventoryService = Depends(get_svc),
):
    days_map = {"today": 1, "7days": 7, "30days": 30}
    days = days_map.get(period, 7)
    return await svc.get_fast_selling(days=days)
