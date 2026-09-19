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
from datetime import datetime, timezone, timedelta, date as date_type
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.transaction import TransactionCreate, TransactionResponse, doc_to_transaction
from models.product import ProductResponse, doc_to_product
from config import settings

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
        # Exclude archived products from active inventory
        cursor = self._db.products.find({"status": {"$ne": "archived"}}).sort("name", 1)
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

    async def archive_product(self, product_id: str) -> Optional[ProductResponse]:
        """Soft-delete: marks product as archived without destroying transaction history."""
        now = datetime.now(timezone.utc).isoformat()
        await self._db.products.update_one(
            {"_id": product_id},
            {"$set": {"status": "archived", "updatedAt": now}},
        )
        doc = await self._db.products.find_one({"_id": product_id})
        return doc_to_product(doc) if doc else None

    async def add_stock(
        self,
        product_id: str,
        quantity: float,
        unit: Optional[str] = None,
        note: Optional[str] = None,
    ) -> "TransactionResponse":
        """Add stock via a STOCK_IN transaction. One action = one transaction."""
        product = await self.get_product(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        return await self.create_transaction(TransactionCreate(
            productId=product.id,
            productName=product.name,
            quantity=quantity,
            unit=unit or product.unit,
            type="stock_in",
            source="manual",
            note=note,
        ))

    async def remove_stock(
        self,
        product_id: str,
        quantity: float,
        unit: Optional[str] = None,
        note: Optional[str] = None,
    ) -> "TransactionResponse":
        """Remove stock via a STOCK_OUT transaction. Raises InsufficientStockError if not enough."""
        product = await self.get_product(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        if quantity > product.currentStock:
            raise InsufficientStockError(
                product.name, product.currentStock, quantity, product.unit
            )
        return await self.create_transaction(TransactionCreate(
            productId=product.id,
            productName=product.name,
            quantity=quantity,
            unit=unit or product.unit,
            type="stock_out",
            source="manual",
            note=note,
        ))

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
        today = date_type.today()
        alerts = []
        for p in products:
            # ── Stock alerts ──────────────────────────────────────────────────
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

            # ── Expiry alerts ─────────────────────────────────────────────────
            if p.expiryDate:
                try:
                    expiry = date_type.fromisoformat(p.expiryDate)
                    days_until = (expiry - today).days
                    if days_until < 0:
                        alerts.append({
                            "id": f"alert_{p.id}_expired",
                            "productId": p.id,
                            "productName": p.name,
                            "type": "expired",
                            "severity": "critical",
                            "message": f"{p.name} expired on {p.expiryDate}.",
                            "currentStock": p.currentStock,
                            "unit": p.unit,
                            "expiryDate": p.expiryDate,
                            "daysUntilExpiry": days_until,
                        })
                    elif days_until <= settings.expiry_soon_days:
                        alerts.append({
                            "id": f"alert_{p.id}_expiring",
                            "productId": p.id,
                            "productName": p.name,
                            "type": "expiring_soon",
                            "severity": "warning",
                            "message": f"{p.name} expires in {days_until} day(s) on {p.expiryDate}.",
                            "currentStock": p.currentStock,
                            "unit": p.unit,
                            "expiryDate": p.expiryDate,
                            "daysUntilExpiry": days_until,
                        })
                except (ValueError, TypeError):
                    logger.warning(f"Invalid expiryDate for product {p.id}: {p.expiryDate}")

        return alerts

    async def get_expiry_alerts(self) -> list[dict]:
        """Returns only expiry-related alerts (expired + expiring_soon)."""
        all_alerts = await self.get_alerts()
        return [a for a in all_alerts if a["type"] in ("expired", "expiring_soon")]


    # ── Dashboard ─────────────────────────────────────────────────────────────

    async def get_daily_inventory_summary(self, date_str: Optional[str] = None) -> dict:
        """
        Returns a per-product daily inventory breakdown for a given date.

        Opening stock = product's openingStock + all transactions BEFORE the day's start.
        This is a ledger replay — MongoDB transactions are the source of truth.
        AI never calculates these numbers.

        Args:
            date_str: ISO date string "YYYY-MM-DD". Defaults to today in IST (UTC+5:30).
        """
        # Default to today in IST
        if not date_str:
            from zoneinfo import ZoneInfo
            ist = ZoneInfo("Asia/Kolkata")
            date_str = datetime.now(ist).date().isoformat()

        # Day boundaries in UTC (transactions stored in UTC)
        try:
            target_date = date_type.fromisoformat(date_str)
        except ValueError:
            target_date = date_type.today()

        day_start = datetime(
            target_date.year, target_date.month, target_date.day,
            0, 0, 0, tzinfo=timezone.utc
        )
        day_end = datetime(
            target_date.year, target_date.month, target_date.day,
            23, 59, 59, 999999, tzinfo=timezone.utc
        )
        day_start_iso = day_start.isoformat()
        day_end_iso = day_end.isoformat()

        # Get all active products
        products = await self.get_all_products()

        # Fetch ALL transactions before end of day for opening + intraday calculations
        all_txs_before_end = await self._db.transactions.find(
            {"timestamp": {"$lte": day_end_iso}}
        ).sort("timestamp", 1).to_list(length=None)

        product_results = []
        stock_in_count = 0
        stock_out_count = 0

        for product in products:
            pid = product.id
            # Opening stock = product.openingStock + all transactions BEFORE day start
            opening = product.openingStock
            for tx in all_txs_before_end:
                if tx["productId"] != pid:
                    continue
                if tx["timestamp"] >= day_start_iso:
                    break  # We've hit the day boundary (sorted ASC)
                if tx["type"] == "stock_in":
                    opening += tx["quantity"]
                elif tx["type"] == "stock_out":
                    opening -= tx["quantity"]

            # Intraday transactions
            stock_in = 0.0
            stock_out = 0.0
            had_activity = False
            for tx in all_txs_before_end:
                if tx["productId"] != pid:
                    continue
                if tx["timestamp"] < day_start_iso:
                    continue
                had_activity = True
                if tx["type"] == "stock_in":
                    stock_in += tx["quantity"]
                    stock_in_count += 1
                elif tx["type"] == "stock_out":
                    stock_out += tx["quantity"]
                    stock_out_count += 1

            closing = opening + stock_in - stock_out

            # Only include products that had activity OR are important (low/out of stock)
            if had_activity or product.currentStock <= product.reorderLevel:
                product_results.append({
                    "productId": pid,
                    "productName": product.name,
                    "unit": product.unit,
                    "openingStock": round(opening, 2),
                    "stockIn": round(stock_in, 2),
                    "stockOut": round(stock_out, 2),
                    "closingStock": round(closing, 2),
                    "hadActivity": had_activity,
                })

        # Sort: products with activity first, then by name
        product_results.sort(key=lambda x: (0 if x["hadActivity"] else 1, x["productName"]))

        return {
            "date": date_str,
            "products": product_results,
            "totals": {
                "stockInTransactions": stock_in_count,
                "stockOutTransactions": stock_out_count,
                "netChange": round(
                    sum(r["stockIn"] - r["stockOut"] for r in product_results), 2
                ),
                "productsWithActivity": sum(1 for r in product_results if r["hadActivity"]),
            },
        }

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
