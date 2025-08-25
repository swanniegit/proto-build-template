from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .state import sessions
from .websocket.connection import router as websocket_router

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)

@app.get("/")
def read_root():
    return {"message": "ProtoBuild Backend is running"}

@app.get("/health")
def health_check():
    from .state import sessions
    return {"status": "healthy", "sessions": len(sessions)}
