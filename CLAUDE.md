# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an "AI Real-Time Prototyper" project built as a Progressive Web App (PWA) using React, TypeScript, Vite, and a FastAPI backend. The system enables users to describe UI components in natural language and generates interactive prototypes in real-time through WebSocket communication with specialized AI agents. The system now features a dynamic agent template system, multi-provider LLM support, and comprehensive user authentication.

## Architecture

### Frontend (React + TypeScript + Vite)
- **Location**: `frontend/` directory
- **Entry Point**: `frontend/src/main.tsx` 
- **Main App**: `frontend/src/App.tsx` - Full-featured router with navigation and authentication
- **Core Components**: 
  - `HomePage.tsx` - Landing page with feature overview
  - `AdvancedWorkspace.tsx` - Main workspace interface
  - `PrototypeBuilder.tsx` - Prototype generation interface
  - `AgentTemplateEditor.tsx` - Template management interface
  - `Settings.tsx` - System configuration and LLM provider settings
- **Block-based Architecture**: Modular UI components in `blocks/` directory
- **Build Tool**: Vite with PWA plugin for offline support
- **Styling**: Tailwind CSS with PostCSS configuration
- **Authentication**: Context-based auth provider with JWT support

### Backend (FastAPI + Multi-LLM)
- **Location**: `backend/` directory
- **Main Server**: `backend/app/main.py` - FastAPI application with CORS middleware and full API routing
- **Entry Point**: `backend/run.py` - Development server launcher with auto-reload
- **API Endpoints**: 
  - `/api/agent-templates` - Agent template management
  - `/api/llm` - LLM provider management and chat completions
  - `/api/health` - System health monitoring
  - `/api/users` - User authentication and management
- **WebSocket**: `backend/app/websocket/` - Connection management and handlers
- **Agents**: `backend/app/agents/` - Specialized AI agents with base classes and memory
- **Models**: `backend/app/models/` - Pydantic models for API, agents, and templates
- **Services**: `backend/app/services/` - Business logic for templates, auth, and storage
- **LLM Integration**: Multi-provider support (OpenAI, DeepSeek, Kimi) via `llm/` module
- **Agent Templates**: Dynamic template system with JSON storage in `agent_templates.json`

### Key Technologies
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety across frontend with strict mode
- **WebSocket**: Real-time bidirectional communication 
- **Multi-LLM Support**: OpenAI, DeepSeek, and Kimi provider integration
- **PWA**: Service worker for offline functionality
- **FastAPI**: High-performance Python web framework
- **Redis**: Optional caching and session storage
- **JWT Authentication**: Token-based user authentication
- **Playwright**: End-to-end testing framework

## Development Commands

### Backend Setup & Development
```bash
cd backend
pip install -r requirements.txt
cp env.example .env  # IMPORTANT: Replace with your actual OpenAI API key
python run.py       # Start backend server on port 8000 (recommended)
# Alternative: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Test backend functionality
python test_multi_agent.py      # Multi-agent system tests
python test_template_system.py  # Agent template system tests
python test_development_planner.py # Development planner agent tests
```

### Frontend Setup & Development  
```bash
npm install          # Install all dependencies (from project root)
npm run dev          # Start Vite dev server (with --host 0.0.0.0)
npm run build        # Build for production (runs TypeScript then Vite build)
npm run lint         # Run ESLint with strict rules
npm run preview      # Preview production build

# Testing with Playwright
npx playwright test  # Run end-to-end tests
npx playwright install # Install browser binaries
```

**Note**: The frontend runs from the project root but sources from `frontend/` directory due to Vite configuration.

## Core Application Logic

### Multi-Agent Architecture
The system features a sophisticated multi-agent architecture with specialized AI agents:

**Agent Types** (defined in `backend/app/models/agent_models.py`):
- **UI Designer**: Visual design, layouts, color schemes, typography
- **UX Researcher**: User experience, usability principles, accessibility
- **Developer**: Technical feasibility, code structure, performance
- **Product Manager**: Business requirements, user needs, strategy
- **Stakeholder**: Business alignment, compliance considerations
- **Epic Generator**: Breaks down PRDs into manageable epics
- **Story Generator**: Creates detailed user stories with acceptance criteria
- **QA Planner**: Develops comprehensive test scenarios
- **Review Agent**: Reviews deliverables for completeness and quality

### Real-Time Prototype Generation Flow
1. **User Input**: Natural language description via textarea in multi-agent interface
2. **WebSocket Transmission**: Sent to `/ws/{session_id}` endpoint
3. **Agent Processing**: Specialized agents analyze and provide insights
4. **Agent Collaboration**: Handoffs between agents, cross-references, and parallel analysis
5. **Enhanced Responses**: Agents provide insights, confidence levels, and references to other agents
6. **Live Updates**: Real-time agent responses with color-coded UI

### Enhanced Agent Response Format
The system supports enhanced agent responses with:
- **Confidence Levels**: Numerical confidence scores for agent insights
- **Insights**: Structured insights categorized by type (concern, suggestion, analysis, etc.)
- **Cross-Agent References**: Agents can reference and build on other agents' work
- **Questions**: Agents can pose questions to other specialized agents
- **Handoffs**: Intelligent delegation to appropriate specialist agents

## Configuration Files

### TypeScript Configuration
- **tsconfig.json**: Strict TypeScript with ES2020 target, includes only `frontend/src`
- **tsconfig.node.json**: Node-specific TypeScript configuration

### Vite Configuration
- **vite.config.ts**: 
  - Root directory set to `frontend/`
  - PWA plugin with standalone display mode
  - Build output to `../dist/` directory
  - React plugin enabled

### PWA Configuration
- **Service Worker**: `frontend/public/service-worker.js` - Cache-first strategy
- **Manifest**: `frontend/public/manifest.json` - App metadata and icons

## API & WebSocket Protocol

### Backend Endpoints
- **GET /**: Root status endpoint returning `{"message": "ProtoBuild Backend is running"}`
- **GET /health**: Health check endpoint with session count
- **WebSocket /ws/{session_id}**: Real-time multi-agent communication
- **Agent Templates API**:
  - `GET /api/agent-templates/` - Get all templates
  - `GET /api/agent-templates/active` - Get active templates
  - `POST /api/agent-templates/` - Create custom template
  - `PUT /api/agent-templates/{id}` - Update template
  - `DELETE /api/agent-templates/{id}` - Delete custom template
- **LLM Providers API**:
  - `GET /api/llm/providers` - Get available providers and status
  - `GET /api/llm/models` - Get available models
  - `POST /api/llm/chat` - Direct chat completion
  - `GET /api/llm/test` - Test all providers
- **User Authentication API**:
  - `POST /api/users/register` - User registration
  - `POST /api/users/login` - User login
  - `GET /api/users/me` - Get current user profile

### WebSocket Message Format
**Client → Server**:
```json
{
  "text": "Create a login form with email and password",
  "type": "generate_prototype"
}
```

**Server → Client** (Enhanced Format):
```json
{
  "type": "multi_agent_response",
  "workflow": {
    "current_agent": "ui_designer",
    "responses": [
      {
        "agent_type": "ui_designer",
        "content": "Analysis content...",
        "confidence_level": 0.85,
        "insights": [...],
        "references_to_agents": [...],
        "questions_for_agents": {...}
      }
    ]
  }
}
```

## Important Implementation Details

### Multi-Agent System Architecture
- **Agent Base Classes**: `backend/app/agents/base.py` provides foundation for all agents
- **Handoff Coordinator**: `backend/app/agents/handoff_coordinator.py` manages agent delegation
- **Memory System**: `backend/app/agents/memory.py` provides session and shared agent memory
- **Prompt Management**: `backend/app/prompts/prompt_manager.py` loads agent-specific prompts from text files
- **State Management**: `backend/app/state.py` manages global session state

### Frontend State Management
- **Enhanced Features**: UI toggles for confidence levels, insights, references, and questions
- **Agent Filtering**: Tab-based agent response filtering with color coding
- **Type Guards**: Runtime detection of enhanced vs. legacy response formats
- **Real-time Updates**: WebSocket integration for live agent collaboration

### Session Management
- **In-Memory Sessions**: Global session dictionary in `backend/app/state.py`
- **WebSocket Management**: Connection handling in `backend/app/websocket/manager.py`
- **Agent Memory**: Persistent agent memory across conversations

## Security & Configuration

### Environment Variables
- **OPENAI_API_KEY**: Required for OpenAI integration (set in `backend/.env`)
- **DEEPSEEK_API_KEY**: Optional DeepSeek integration 
- **KIMI_API_KEY**: Optional Kimi integration
- **JWT_SECRET**: Required for JWT authentication features
- **REDIS_URL**: Optional Redis connection for caching and sessions

**SECURITY WARNING**: Never commit actual API keys to version control. Use `backend/env.example` as template.

### CORS Configuration
- Allows origins: `localhost:3000`, `localhost:5173`, `localhost:5174`, `localhost:5175`
- Configured in `backend/app/main.py`

## File Structure Critical Notes

### Root Level Configuration
- **package.json**: NPM dependencies and scripts at project root
- **vite.config.ts**: Vite configuration pointing to `frontend/` directory
- **tsconfig.json**: TypeScript configuration including only `frontend/src`

### Backend Structure
- **Modular Architecture**: Organized into `agents/`, `api/`, `core/`, `llm/`, `models/`, `prompts/`, `services/`, `websocket/`
- **Agent Prompts**: Individual text files for each agent type in `prompts/` directory
- **Agent Templates**: Dynamic template system with JSON storage and API management
- **Pydantic Models**: Type-safe data models in `models/` directory for API, agents, templates, and users
- **Service Layer**: Business logic separated into `services/` directory
- **LLM Abstraction**: Provider-agnostic LLM interface in `llm/` module
- **Testing**: Multiple test files for different system components

### Frontend Structure
- **Full Routing**: Complete application with navigation between multiple views
- **Component Organization**: Main components in `components/` directory
- **Block-based Architecture**: Reusable UI components organized in `blocks/` with nested structure:
  - `blocks/builders/` - Complex UI building blocks
  - `blocks/controllers/` - Control and navigation components  
  - `blocks/utilities/` - Utility components
- **Provider Pattern**: Context-based authentication and state management
- **Modular Workspace**: Template-based multi-agent builder interface

## Development Workflow & Debugging

### WebSocket Connection
- Backend must be running on port 8000 before starting frontend
- Frontend connects to multi-agent WebSocket endpoint
- Session IDs generated client-side as `session-${Date.now()}`

### Agent System Debugging
- Agent responses include detailed metadata and cross-references
- Color-coded agent responses in UI for easy identification
- Enhanced features can be toggled on/off for testing

### Cursor Rules Integration
The project includes Cursor IDE rules in `.cursor/rules/my-rules.mdc`:
- Think carefully and make no assumptions
- Be concise and elegant
- Change as little code as possible

### LLM Provider Testing
- Use `/api/llm/test` endpoint to test all configured providers
- Individual provider status available via `/api/llm/providers`
- Models can be queried with `/api/llm/models` with optional provider filtering

## Extension Points

The codebase is designed for easy extension:
- **New Agent Types**: Create custom templates via API or UI editor
- **New LLM Providers**: Add providers by implementing `BaseProvider` interface in `llm/` module
- **Enhanced UI Features**: Additional agent collaboration features in the frontend
- **Database Integration**: Replace JSON storage with persistent database via service layer
- **Authentication**: Full JWT-based authentication system implemented
- **Export Functions**: Generate deliverables from agent analysis
- **Plugin System**: Extensible block-based frontend architecture

This project represents a sophisticated multi-agent AI system with dynamic template management, multi-provider LLM support, and comprehensive user authentication for collaborative prototype analysis and development planning.