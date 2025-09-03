# GLOBAL UTF-8 ENCODING FIX - Must be at the top
import os
import sys
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    os.environ["PYTHONUTF8"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .state import sessions
from .websocket.connection import router as websocket_router
from .api.agent_templates import router as agent_templates_router
from .api.llm_providers import router as llm_providers_router
from .api.health import router as health_router
from .api.users import router as users_router
from .api.development_pipeline import router as development_pipeline_router

app = FastAPI(title="AI Multi-Agent Prototyper API", version="2.0.0")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)
app.include_router(agent_templates_router)
app.include_router(llm_providers_router)
app.include_router(health_router)
app.include_router(users_router)
app.include_router(development_pipeline_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "ProtoBuild Backend is running"}

@app.get("/health")
def health_check():
    from .state import sessions
    return {"status": "healthy", "sessions": len(sessions)}
