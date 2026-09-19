"""
Vyapari Voice — FastAPI Backend
================================
Milestone 2: AI-Powered Voice Inventory Engine

Run locally:
    cd backend
    pip install -r requirements.txt
    cp .env.example .env   # fill in GEMINI_API_KEY and MONGODB_URI
    uvicorn main:app --reload --port 8000

Environment:
    GEMINI_API_KEY  — Google AI Studio key (never exposed to frontend)
    MONGODB_URI     — MongoDB connection string
    FRONTEND_URL    — CORS origin (http://localhost:5173 for dev)
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from db.mongo import connect_db, close_db
from db.seed import seed_database
from routers import products, inventory, transactions, voice, assistant, dashboard, profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("🚀 Starting Vyapari Voice backend...")
    await connect_db()
    await seed_database()
    logger.info("✅ Backend ready")
    yield
    await close_db()
    logger.info("Backend shutdown complete.")


app = FastAPI(
    title="Vyapari Voice API",
    description="AI-powered multilingual voice inventory management for kirana shops",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite frontend in dev and the Vercel URL in production
cors_origins = [settings.frontend_url]
if settings.environment == "development":
    cors_origins += ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(transactions.router)
app.include_router(voice.router)
app.include_router(assistant.router)
app.include_router(dashboard.router)
app.include_router(profile.router)


@app.get("/")
async def root():
    return {
        "service": "Vyapari Voice API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vyapari-voice-backend"}
