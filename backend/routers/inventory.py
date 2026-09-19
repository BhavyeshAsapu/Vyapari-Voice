from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService, InsufficientStockError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inventory", tags=["inventory"])

# In-memory dismissed alert IDs (persisted via frontend localStorage, reset on server restart)
# For server-side persistence the dismissed set is also stored in MongoDB
DISMISSED_COLLECTION = "dismissed_alerts"


def get_svc(db: AsyncIOMotorDatabase = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


class StockAdjustRequest(BaseModel):
    quantity: float
    unit: Optional[str] = None
    note: Optional[str] = None


class DismissAlertRequest(BaseModel):
    alertId: str


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


@router.get("/expiry")
async def get_expiry_alerts(svc: InventoryService = Depends(get_svc)):
    """Returns only expiry alerts — products that are expired or expiring soon."""
    return await svc.get_expiry_alerts()


@router.get("/alerts")
async def get_alerts(svc: InventoryService = Depends(get_svc), db: AsyncIOMotorDatabase = Depends(get_db)):
    all_alerts = await svc.get_alerts()
    # Filter out dismissed alerts
    dismissed = {doc["alertId"] async for doc in db[DISMISSED_COLLECTION].find({})}
    return [a for a in all_alerts if a["id"] not in dismissed]


@router.post("/alerts/dismiss")
async def dismiss_alert(req: DismissAlertRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Mark an alert as dismissed. Does NOT change inventory data."""
    await db[DISMISSED_COLLECTION].update_one(
        {"alertId": req.alertId},
        {"$set": {"alertId": req.alertId}},
        upsert=True,
    )
    return {"success": True, "alertId": req.alertId}


@router.delete("/alerts/dismissed")
async def clear_dismissed_alerts(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Clear all dismissed alert records."""
    await db[DISMISSED_COLLECTION].delete_many({})
    return {"success": True}


@router.post("/{product_id}/add-stock")
async def add_stock(
    product_id: str,
    req: StockAdjustRequest,
    svc: InventoryService = Depends(get_svc),
):
    """
    Add stock to a product. Creates a single STOCK_IN transaction.
    One request = one transaction (frontend must prevent double-submit).
    """
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")
    try:
        tx = await svc.add_stock(product_id, req.quantity, req.unit, req.note)
        product = await svc.get_product(product_id)
        return {
            "success": True,
            "transactionId": tx.id,
            "productId": product_id,
            "newStock": product.currentStock if product else None,
            "message": f"Added {req.quantity} {tx.unit}.",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"add-stock failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{product_id}/remove-stock")
async def remove_stock(
    product_id: str,
    req: StockAdjustRequest,
    svc: InventoryService = Depends(get_svc),
):
    """
    Remove stock from a product. Creates a single STOCK_OUT transaction.
    Returns INSUFFICIENT_STOCK if requested quantity exceeds current stock.
    """
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")
    try:
        tx = await svc.remove_stock(product_id, req.quantity, req.unit, req.note)
        product = await svc.get_product(product_id)
        return {
            "success": True,
            "transactionId": tx.id,
            "productId": product_id,
            "newStock": product.currentStock if product else None,
            "message": f"Removed {req.quantity} {tx.unit}.",
        }
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "INSUFFICIENT_STOCK",
                "message": f"Only {e.available} {e.unit} are available.",
                "available": e.available,
                "requested": e.requested,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"remove-stock failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
