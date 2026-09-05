from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.risk import router as risk_router

app = FastAPI(title="CareWatch AI Risk Assessment Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk_router, prefix="/api")

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}

@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "CareWatch AI Risk Assessment Service",
        "version": "1.0.0",
        "status": "running"
    }
