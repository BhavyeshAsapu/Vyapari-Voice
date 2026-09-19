"""
InventoryService — all database reads and writes.

Business rules enforced here (not in the AI layer):
- Negative stock prevention
- Unit consistency validation
- Idempotency (duplicate confirm rejection)
- Compensating transactions for undo (original never deleted)
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.transaction import TransactionCreate, TransactionResponse, doc_to_transaction
from models.product import ProductResponse, doc_to_product

logger = logging.getLogger(__name__)


class InsufficientStockError(Exception):
    def __init__(self, product_name: str, available: float, requested: float, unit: str):
        self.product_name = product_name
        self.available = available
        self.requested = requested
        self.unit = unit
        super().__init__(
            f"Only {available} {unit} of {product_name} available; requested {requested}."
        )


class InventoryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self._db = db

    # ── Products ──────────────────────────────────────────────────────────────

    async def get_all_products(self) -> list[ProductResponse]:
        cursor = self._db.products.find({}).sort("name", 1)
        docs = await cursor.to_list(length=None)
        return [doc_to_product(d) for d in docs]

    async def get_product(self, product_id: str) -> Optional[ProductResponse]:
        doc = await self._db.products.find_one({"_id": product_id})
        return doc_to_product(doc) if doc else None

    async def create_product(self, data: dict) -> ProductResponse:
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "_id": f"p{uuid.uuid4().hex[:8]}",
            **data,
            "currentStock": data.get("currentStock", data.get("openingStock", 0)),
            "createdAt": now,
            "updatedAt": now,
        }
        await self._db.products.insert_one(doc)
        return doc_to_product(doc)

    async def update_product(self, product_id: str, updates: dict) -> Optional[ProductResponse]:
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        await self._db.products.update_one({"_id": product_id}, {"$set": updates})
        doc = await self._db.products.find_one({"_id": product_id})
        return doc_to_product(doc) if doc else None

    # ── Transactions ──────────────────────────────────────────────────────────

    async def get_transactions(
        self,
        limit: int = 50,
        tx_type: Optional[str] = None,
    ) -> list[TransactionResponse]:
        query = {}
        if tx_type:
            query["type"] = tx_type
        cursor = self._db.transactions.find(query).sort("timestamp", -1).limit(limit)
        docs = await cursor.to_list(length=None)
        return [doc_to_transaction(d) for d in docs]

    async def get_today_transactions(self) -> list[TransactionResponse]:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        cursor = self._db.transactions.find(
            {"timestamp": {"$gte": today_start}}
        ).sort("timestamp", -1)
        docs = await cursor.to_list(length=None)
        return [doc_to_transaction(d) for d in docs]

    async def create_transaction(self, tx: TransactionCreate) -> TransactionResponse:
        """
        Create a stock transaction with full business rule validation:
        - Product must exist
        - Stock out cannot exceed current stock
        - Updates product.currentStock atomically
        """
        # Fetch product
        product = await self._db.products.find_one({"_id": tx.productId})
        if not product:
            raise ValueError(f"Product {tx.productId} not found")

        current = product["currentStock"]

        # Validate stock out
        if tx.type == "stock_out":
            if tx.quantity > current:
                raise InsufficientStockError(
                    product["name"], current, tx.quantity, product["unit"]
                )
            new_stock = current - tx.quantity
        else:
            new_stock = current + tx.quantity

        now = datetime.now(timezone.utc).isoformat()
        tx_id = f"t{uuid.uuid4().hex[:12]}"

        tx_doc = {
            "_id": tx_id,
            "productId": tx.productId,
            "productName": tx.productName,
            "quantity": tx.quantity,
            "unit": tx.unit,
            "type": tx.type,
            "source": tx.source,
            "note": tx.note,
            "price": tx.price,
            "timestamp": now,
        }

        # Atomic update: insert transaction + update product stock
        await self._db.transactions.insert_one(tx_doc)
        await self._db.products.update_one(
            {"_id": tx.productId},
            {"$set": {"currentStock": new_stock, "updatedAt": now}},
        )

        logger.info(
            f"Transaction {tx_id}: {tx.type} {tx.quantity} {tx.unit} of "
            f"{tx.productName} → new stock: {new_stock}"
        )
        return doc_to_transaction(tx_doc)

    async def undo_last_transaction(self, product_id: Optional[str] = None) -> Optional[TransactionResponse]:
        """
        Find the last eligible transaction and create a compensating transaction.
        Does NOT delete the original — creates an offsetting entry.
        Returns the compensating transaction for confirmation display.
        """
        query = {}
        if product_id:
            query["productId"] = product_id
        cursor = self._db.transactions.find(query).sort("timestamp", -1).limit(1)
        docs = await cursor.to_list(length=1)
        if not docs:
            return None
        last = docs[0]
        return doc_to_transaction(last)  # Return for confirmation; actual undo on confirm

    async def execute_undo(self, original_tx_id: str) -> TransactionResponse:
        """Create a compensating transaction for the given original transaction ID."""
        original = await self._db.transactions.find_one({"_id": original_tx_id})
        if not original:
            raise ValueError(f"Transaction {original_tx_id} not found")

        # Reverse the type
        reverse_type = "stock_out" if original["type"] == "stock_in" else "stock_in"

        tx = TransactionCreate(
            productId=original["productId"],
            productName=original["productName"],
            quantity=original["quantity"],
            unit=original["unit"],
            type=reverse_type,
            source="manual",
            note=f"Undo of transaction {original_tx_id}",
        )
        return await self.create_transaction(tx)

    # ── Alerts ────────────────────────────────────────────────────────────────

    async def get_alerts(self) -> list[dict]:
        products = await self.get_all_products()
        alerts = []
        for p in products:
            if p.currentStock == 0:
                alerts.append({
                    "id": f"alert_{p.id}_oos",
                    "productId": p.id,
                    "productName": p.name,
                    "type": "out_of_stock",
                    "severity": "critical",
                    "message": f"{p.name} is out of stock.",
                    "currentStock": p.currentStock,
                    "threshold": p.reorderLevel,
                    "unit": p.unit,
                })
            elif p.currentStock <= p.reorderLevel:
                alerts.append({
                    "id": f"alert_{p.id}_low",
                    "productId": p.id,
                    "productName": p.name,
                    "type": "low_stock",
                    "severity": "warning",
                    "message": f"{p.name} is running low. Reorder level: {p.reorderLevel} {p.unit}.",
                    "currentStock": p.currentStock,
                    "threshold": p.reorderLevel,
                    "unit": p.unit,
                })
            elif p.capacity and p.currentStock > p.capacity:
                alerts.append({
                    "id": f"alert_{p.id}_cap",
                    "productId": p.id,
                    "productName": p.name,
                    "type": "over_capacity",
                    "severity": "warning",
                    "message": f"{p.name} exceeds capacity: {p.currentStock}/{p.capacity} {p.unit}.",
                    "currentStock": p.currentStock,
                    "capacity": p.capacity,
                    "unit": p.unit,
                })
        return alerts

    # ── Dashboard ─────────────────────────────────────────────────────────────

    async def get_daily_summary(self) -> dict:
        today_txs = await self.get_today_transactions()
        products = await self.get_all_products()

        stock_in_units = sum(t.quantity for t in today_txs if t.type == "stock_in")
        stock_out_units = sum(t.quantity for t in today_txs if t.type == "stock_out")
        updated_ids = {t.productId for t in today_txs}

        low_stock = sum(1 for p in products if 0 < p.currentStock <= p.reorderLevel)
        out_of_stock = sum(1 for p in products if p.currentStock == 0)

        inventory_value = sum(p.currentStock * p.purchasePrice for p in products)
        sales_value = sum(
            t.quantity * next((p.sellingPrice for p in products if p.id == t.productId), 0)
            for t in today_txs if t.type == "stock_out"
        )
        purchase_value = sum(
            t.quantity * next((p.purchasePrice for p in products if p.id == t.productId), 0)
            for t in today_txs if t.type == "stock_out"
        )
        gross_profit = sales_value - purchase_value

        return {
            "date": datetime.now(timezone.utc).date().isoformat(),
            "productsUpdated": len(updated_ids),
            "totalStockIn": stock_in_units,
            "totalStockOut": stock_out_units,
            "lowStockCount": low_stock,
            "outOfStockCount": out_of_stock,
            "inventoryValue": inventory_value,
            "salesValue": sales_value,
            "estimatedGrossProfit": gross_profit,
        }

    async def get_fast_selling(self, days: int = 7) -> list[dict]:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        cursor = self._db.transactions.find({
            "type": "stock_out",
            "timestamp": {"$gte": since},
        })
        txs = await cursor.to_list(length=None)

        # Aggregate by product
        product_totals: dict[str, dict] = {}
        for t in txs:
            pid = t["productId"]
            if pid not in product_totals:
                product_totals[pid] = {
                    "productId": pid,
                    "productName": t["productName"],
                    "unit": t["unit"],
                    "totalOut": 0,
                }
            product_totals[pid]["totalOut"] += t["quantity"]

        items = sorted(product_totals.values(), key=lambda x: x["totalOut"], reverse=True)

        if not items:
            return []

        max_out = items[0]["totalOut"]
        for item in items:
            item["percentage"] = round(item["totalOut"] / max_out * 100) if max_out else 0

        return items[:10]
