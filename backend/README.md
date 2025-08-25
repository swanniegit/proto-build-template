# AI Prototype Builder Backend

FastAPI backend for the AI-powered real-time prototyping tool.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env and add your OpenAI API key
   OPENAI_API_KEY=your-actual-api-key-here
   ```

3. **Run the server:**
   ```bash
   python server.py
   ```

   Or with uvicorn directly:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

- **GET /** - Root endpoint with status
- **GET /health** - Health check
- **WebSocket /ws/{session_id}** - Real-time prototype generation

## WebSocket Protocol

Send messages in this format:
```json
{
  "text": "Create a login form with email and password"
}
```

Receive prototype updates:
```json
{
  "type": "prototype",
  "data": {
    "component": "div",
    "props": {"className": "login-form"},
    "children": [...]
  }
}
```

## Features

- Real-time AI-powered UI generation
- Session-based memory and learning
- WebSocket communication
- OpenAI GPT-4 integration
- CORS support for frontend development

## Development

The server runs on `http://localhost:8000` by default.

Frontend should connect to `ws://localhost:8000/ws/{session_id}` for WebSocket communication.
