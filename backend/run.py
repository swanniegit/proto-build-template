#!/usr/bin/env python3
"""
Simple script to run the AI Prototype Builder backend server.
"""

import uvicorn

if __name__ == "__main__":
    print("Starting AI Prototype Builder Backend...")
    print("Server will be available at: http://localhost:8000")
    print("WebSocket endpoint: ws://localhost:8000/ws/{session_id}")
    print("API docs: http://localhost:8000/docs")
    print("Auto-reload enabled for development")
    print("Press Ctrl+C to stop the server")
    print()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )