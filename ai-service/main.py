import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("ENV", "development").lower() == "development"
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
