"""
Seed script: Populates MongoDB with Milestone 1 mock data if collections are empty.
Run on startup or manually with: python -m db.seed
"""
from datetime import datetime, timezone
from db.mongo import get_db

SEED_PRODUCTS = [
    {
        "_id": "p1", "name": "Rice", "brand": "Sona Masoori",
        "category": "Grains & Rice", "unit": "Bags",
        "currentStock": 33, "openingStock": 50, "reorderLevel": 10, "capacity": 50,
        "purchasePrice": 2200, "sellingPrice": 2500,
        "aliases": ["Rice", "Biyyam", "బియ్యం", "chawal", "चावल"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-19T09:15:00+05:30",
    },
    {
        "_id": "p2", "name": "Sugar", "brand": "EID Parry",
        "category": "Sugar & Salt", "unit": "Bags",
        "currentStock": 4, "openingStock": 20, "reorderLevel": 5, "capacity": 20,
        "purchasePrice": 3600, "sellingPrice": 4000,
        "aliases": ["Sugar", "Cheeni", "చక్కెర", "chini", "चीनी", "shakkar"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-19T09:15:00+05:30",
    },
    {
        "_id": "p3", "name": "Sunflower Oil", "brand": "Fortune",
        "category": "Oils & Ghee", "unit": "Litres",
        "currentStock": 6, "openingStock": 30, "reorderLevel": 8, "capacity": 30,
        "purchasePrice": 140, "sellingPrice": 160,
        "aliases": ["Sunflower Oil", "Fortune Oil", "tel", "నూనె", "तेल"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-19T10:00:00+05:30",
    },
    {
        "_id": "p4", "name": "Parle-G", "brand": "Parle",
        "category": "Biscuits & Snacks", "unit": "Packets",
        "currentStock": 12, "openingStock": 48, "reorderLevel": 12, "capacity": 60,
        "purchasePrice": 10, "sellingPrice": 12,
        "aliases": ["Parle G", "Parle-G", "Parle ji", "Parle G biscuits", "పార్లే జీ"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-18T14:30:00+05:30",
    },
    {
        "_id": "p5", "name": "Good Day", "brand": "Britannia",
        "category": "Biscuits & Snacks", "unit": "Packets",
        "currentStock": 8, "openingStock": 24, "reorderLevel": 6, "capacity": 30,
        "purchasePrice": 30, "sellingPrice": 35,
        "aliases": ["Good Day", "Britannia Good Day", "goodday"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-18T16:00:00+05:30",
    },
    {
        "_id": "p6", "name": "Lux Soap", "brand": "Lux",
        "category": "Soaps & Detergents", "unit": "Pieces",
        "currentStock": 35, "openingStock": 48, "reorderLevel": 10, "capacity": 50,
        "purchasePrice": 38, "sellingPrice": 45,
        "aliases": ["Lux", "Lux Soap", "Lux bar"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-17T11:00:00+05:30",
    },
    {
        "_id": "p7", "name": "Toor Dal", "brand": "TATA",
        "category": "Pulses & Lentils", "unit": "KG",
        "currentStock": 15, "openingStock": 25, "reorderLevel": 5, "capacity": 25,
        "purchasePrice": 130, "sellingPrice": 150,
        "aliases": ["Toor Dal", "Kandi Pappu", "కంది పప్పు", "arhar dal", "अरहर दाल"],
        "createdAt": "2026-09-01T08:00:00+05:30",
        "updatedAt": "2026-09-17T15:00:00+05:30",
    },
    {
        "_id": "p8", "name": "Marie Gold", "brand": "Britannia",
        "category": "Biscuits & Snacks", "unit": "Packets",
        "currentStock": 20, "openingStock": 36, "reorderLevel": 8, "capacity": 40,
        "purchasePrice": 25, "sellingPrice": 30,
        "aliases": ["Marie Gold", "Marie", "Britannia Marie"],
        "createdAt": "2026-09-02T08:00:00+05:30",
        "updatedAt": "2026-09-18T10:00:00+05:30",
    },
    {
        "_id": "p9", "name": "Aashirvaad Atta", "brand": "Aashirvaad",
        "category": "Grains & Rice", "unit": "Bags",
        "currentStock": 7, "openingStock": 15, "reorderLevel": 4, "capacity": 15,
        "purchasePrice": 320, "sellingPrice": 360,
        "aliases": ["Aashirvaad Atta", "Atta", "Wheat Flour", "goduma pindi", "గోధుమ పిండి", "आटा"],
        "createdAt": "2026-09-03T08:00:00+05:30",
        "updatedAt": "2026-09-18T09:00:00+05:30",
    },
    {
        "_id": "p10", "name": "Tata Salt", "brand": "TATA",
        "category": "Sugar & Salt", "unit": "Packets",
        "currentStock": 0, "openingStock": 24, "reorderLevel": 5, "capacity": 24,
        "purchasePrice": 20, "sellingPrice": 25,
        "aliases": ["Tata Salt", "Salt", "Uppu", "ఉప్పు", "namak", "नमक"],
        "createdAt": "2026-09-03T08:00:00+05:30",
        "updatedAt": "2026-09-19T08:00:00+05:30",
    },
    {
        "_id": "p11", "name": "Vim Bar", "brand": "Vim",
        "category": "Soaps & Detergents", "unit": "Pieces",
        "currentStock": 28, "openingStock": 36, "reorderLevel": 8, "capacity": 36,
        "purchasePrice": 22, "sellingPrice": 28,
        "aliases": ["Vim Bar", "Vim", "Vim dish wash"],
        "createdAt": "2026-09-04T08:00:00+05:30",
        "updatedAt": "2026-09-17T13:00:00+05:30",
    },
    {
        "_id": "p12", "name": "Mustard Oil", "brand": "Dhara",
        "category": "Oils & Ghee", "unit": "Litres",
        "currentStock": 55, "openingStock": 40, "reorderLevel": 10, "capacity": 50,
        "purchasePrice": 180, "sellingPrice": 210,
        "aliases": ["Mustard Oil", "Dhara Oil", "aavala nune", "ఆవాల నూనె", "sarson tel", "सरसों तेल"],
        "createdAt": "2026-09-05T08:00:00+05:30",
        "updatedAt": "2026-09-18T11:00:00+05:30",
    },
]

SEED_TRANSACTIONS = [
    {"_id": "t1", "productId": "p1", "productName": "Rice", "quantity": 5, "unit": "Bags",
     "type": "stock_in", "source": "voice", "note": "Biyyam 5 bags vachayi",
     "timestamp": "2026-09-19T10:42:00+05:30"},
    {"_id": "t2", "productId": "p2", "productName": "Sugar", "quantity": 2, "unit": "Bags",
     "type": "stock_out", "source": "voice", "note": "Sugar 2 bags ayyindhi",
     "timestamp": "2026-09-19T09:15:00+05:30"},
    {"_id": "t3", "productId": "p4", "productName": "Parle-G", "quantity": 10, "unit": "Packets",
     "type": "stock_in", "source": "manual", "timestamp": "2026-09-19T08:30:00+05:30"},
    {"_id": "t4", "productId": "p3", "productName": "Sunflower Oil", "quantity": 3, "unit": "Litres",
     "type": "stock_out", "source": "voice", "note": "Oil 3 litres poyindhi",
     "timestamp": "2026-09-19T08:00:00+05:30"},
    {"_id": "t5", "productId": "p10", "productName": "Tata Salt", "quantity": 5, "unit": "Packets",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-18T18:30:00+05:30"},
    {"_id": "t6", "productId": "p12", "productName": "Mustard Oil", "quantity": 15, "unit": "Litres",
     "type": "stock_in", "source": "manual", "note": "New stock from distributor",
     "timestamp": "2026-09-18T16:00:00+05:30"},
    {"_id": "t7", "productId": "p5", "productName": "Good Day", "quantity": 6, "unit": "Packets",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-18T14:00:00+05:30"},
    {"_id": "t8", "productId": "p1", "productName": "Rice", "quantity": 10, "unit": "Bags",
     "type": "stock_in", "source": "manual", "note": "Monthly supplier order",
     "timestamp": "2026-09-18T11:00:00+05:30"},
    {"_id": "t9", "productId": "p6", "productName": "Lux Soap", "quantity": 12, "unit": "Pieces",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-18T09:30:00+05:30"},
    {"_id": "t10", "productId": "p7", "productName": "Toor Dal", "quantity": 5, "unit": "KG",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-17T17:00:00+05:30"},
    {"_id": "t11", "productId": "p4", "productName": "Parle-G", "quantity": 24, "unit": "Packets",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-17T15:30:00+05:30"},
    {"_id": "t12", "productId": "p8", "productName": "Marie Gold", "quantity": 12, "unit": "Packets",
     "type": "stock_out", "source": "manual", "timestamp": "2026-09-17T13:00:00+05:30"},
    {"_id": "t13", "productId": "p2", "productName": "Sugar", "quantity": 4, "unit": "Bags",
     "type": "stock_out", "source": "voice", "note": "Sugar 4 bags sold today",
     "timestamp": "2026-09-17T11:30:00+05:30"},
    {"_id": "t14", "productId": "p9", "productName": "Aashirvaad Atta", "quantity": 8, "unit": "Bags",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-16T16:00:00+05:30"},
    {"_id": "t15", "productId": "p1", "productName": "Rice", "quantity": 12, "unit": "Bags",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-16T14:00:00+05:30"},
    {"_id": "t16", "productId": "p11", "productName": "Vim Bar", "quantity": 8, "unit": "Pieces",
     "type": "stock_out", "source": "manual", "timestamp": "2026-09-16T11:00:00+05:30"},
    {"_id": "t17", "productId": "p3", "productName": "Sunflower Oil", "quantity": 24, "unit": "Litres",
     "type": "stock_out", "source": "voice", "timestamp": "2026-09-15T15:00:00+05:30"},
    {"_id": "t18", "productId": "p2", "productName": "Sugar", "quantity": 10, "unit": "Bags",
     "type": "stock_in", "source": "manual", "note": "Restocked from supplier",
     "timestamp": "2026-09-15T09:00:00+05:30"},
]


async def seed_database():
    """Idempotent seed — only inserts if collections are empty."""
    db = get_db()

    # Products
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many(SEED_PRODUCTS)
        print(f"✅ Seeded {len(SEED_PRODUCTS)} products")
    else:
        print("ℹ️  Products collection already has data — skipping seed")

    # Transactions
    if await db.transactions.count_documents({}) == 0:
        await db.transactions.insert_many(SEED_TRANSACTIONS)
        print(f"✅ Seeded {len(SEED_TRANSACTIONS)} transactions")
    else:
        print("ℹ️  Transactions collection already has data — skipping seed")

    # Indexes
    await db.products.create_index("name")
    await db.products.create_index("aliases")
    await db.products.create_index("brand")
    await db.transactions.create_index("productId")
    await db.transactions.create_index("timestamp")
    await db.transactions.create_index("type")
    print("✅ Indexes created")
