"""
Profile API — persists owner/shop details in MongoDB.

GET  /api/profile        — returns current profile
PUT  /api/profile        — upserts profile document
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/profile", tags=["profile"])

PROFILE_DOC_ID = "owner_profile"


class ProfileUpdate(BaseModel):
    ownerName: Optional[str] = None
    shopName: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None  # 'en' | 'te' | 'hi'


class ProfileResponse(BaseModel):
    ownerName: str = ""
    shopName: str = ""
    phone: str = ""
    language: str = "en"


@router.get("", response_model=ProfileResponse)
async def get_profile(db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.profile.find_one({"_id": PROFILE_DOC_ID})
    if not doc:
        return ProfileResponse()
    return ProfileResponse(
        ownerName=doc.get("ownerName", ""),
        shopName=doc.get("shopName", ""),
        phone=doc.get("phone", ""),
        language=doc.get("language", "en"),
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()

    await db.profile.update_one(
        {"_id": PROFILE_DOC_ID},
        {"$set": updates},
        upsert=True,
    )

    doc = await db.profile.find_one({"_id": PROFILE_DOC_ID})
    return ProfileResponse(
        ownerName=doc.get("ownerName", ""),
        shopName=doc.get("shopName", ""),
        phone=doc.get("phone", ""),
        language=doc.get("language", "en"),
    )
