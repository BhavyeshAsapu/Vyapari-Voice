from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from services.inventory import InventoryService
from models.transaction import TransactionCreate, TransactionResponse, doc_to_transaction

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def get_svc(db: AsyncIOMotorDatabase = Depends(get_db)) -> InventoryService:
    return InventoryService(db)


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    limit: int = 50,
    type: str | None = None,
    svc: InventoryService = Depends(get_svc),
):
    return await svc.get_transactions(limit=limit, tx_type=type)


@router.get("/today", response_model=list[TransactionResponse])
async def today_transactions(svc: InventoryService = Depends(get_svc)):
    return await svc.get_today_transactions()


@router.post("", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    svc: InventoryService = Depends(get_svc),
):
    try:
        return await svc.create_transaction(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
