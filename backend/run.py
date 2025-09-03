#!/usr/bin/env python3
"""
Simple script to run the AI Prototype Builder backend server.
"""

import os
import sys
import locale

# GLOBAL UTF-8 ENCODING FIX FOR WINDOWS
# Force UTF-8 encoding for all file operations
if sys.platform == "win32":
    # Set environment variables for UTF-8
    os.environ["PYTHONIOENCODING"] = "utf-8"
    os.environ["PYTHONUTF8"] = "1"
    
    # Try to set locale to UTF-8
    try:
        locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
    except locale.Error:
        try:
            locale.setlocale(locale.LC_ALL, 'C.UTF-8')
        except locale.Error:
            pass  # Fallback to default

import uvicorn
from fastapi.middleware.cors import CORSMiddleware

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