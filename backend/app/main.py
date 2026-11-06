from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health
from app.routers import deviations, evidence_items, rca_investigations, capa_actions
from app.routers.ai import router as ai_router

app = FastAPI(title="Quality RCA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(deviations.router)
app.include_router(evidence_items.router)
app.include_router(rca_investigations.router)
app.include_router(capa_actions.router)
app.include_router(ai_router)

@app.get("/")
def root():
    return {"message": "Quality RCA API is running"}
