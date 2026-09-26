from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.risk import router as risk_router
from app.routes.voice_agent import router as voice_agent_router

app = FastAPI(title="Sanjeevni AI Risk Assessment Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk_router, prefix="/api")
app.include_router(voice_agent_router, prefix="/api")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "sanjeevani-ai",
        "version": "1.0.0"
    }

@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "Sanjeevni AI Risk Assessment Service",
        "version": "1.0.0",
        "status": "running"
    }
