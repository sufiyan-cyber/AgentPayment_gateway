from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.database import init_db
from app.api.endpoints import router as api_router
from app.services.evaluator import evaluator_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database tables
    init_db()
    print("[MandateSentinel] Database initialized.")

    # 2. Run initial baseline training & evaluation pipeline
    try:
        print("[MandateSentinel] Running initial benchmark & baseline fitting on held-out split...")
        evaluator_service.run_pipeline(
            num_sessions=settings.SYNTHETIC_SESSION_COUNT,
            target_requests=settings.SYNTHETIC_REQUEST_COUNT,
        )
        print("[MandateSentinel] Benchmark ready. Evaluation metrics initialized.")
    except Exception as e:
        print(f"[MandateSentinel] Warning initializing evaluator: {e}")

    yield


app = FastAPI(
    title="MandateSentinel API",
    description=(
        "Real-time behavioral trust gate sitting between inbound AI purchasing agents "
        "and merchant Razorpay checkout (<300ms SLA, full audit trail, defense-only)."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "MandateSentinel",
        "status": "online",
        "track": "Track 2 (AI Risk Manager) / Track 1 (AI Growth & Agentic Commerce)",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "MandateSentinel"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
