import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .manager import manager
from .handlers import message_handlers
from ..main import sessions
from ..models.agent_models import AgentType, MultiAgentWorkflow, ConversationContext, SharedAgentMemory
from ..agents.base import DesignAgent, StoriesAndQAAgent
from ..agents.handoff_coordinator import HandoffCoordinator
from ..agents.memory import SessionMemory

router = APIRouter()

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    print(f"[CONNECT] New WebSocket connection for session: {session_id}")
    await manager.connect(websocket, session_id)
    
    # Initialize session if not exists
    if session_id not in sessions:
        print(f"[INIT] Initializing new session: {session_id}")
        try:
            conversation_context = ConversationContext(session_id=session_id)
            shared_memory = SharedAgentMemory(
                session_id=session_id,
                conversation_context=conversation_context
            )
            handoff_coordinator = HandoffCoordinator(shared_memory)
        
            sessions[session_id] = {
            "history": [],
            "memory": SessionMemory(),
            "shared_memory": shared_memory,
            "handoff_coordinator": handoff_coordinator,
            "imported_documents": [],
            "current_prototype": {},
            "previous_response_id": None,  # For GPT-5 Responses API stateful conversations
            "multi_agent_workflow": MultiAgentWorkflow(
                session_id=session_id,
                current_agent=AgentType.UI_DESIGNER
            ),
            "agents": {
                agent_type: DesignAgent(agent_type) for agent_type in [
                    AgentType.UI_DESIGNER, AgentType.UX_RESEARCHER, AgentType.DEVELOPER,
                    AgentType.PRODUCT_MANAGER, AgentType.STAKEHOLDER
                ]
            },
            "stories_qa_agents": {
                agent_type: StoriesAndQAAgent(agent_type) for agent_type in [
                    AgentType.EPIC_GENERATOR, AgentType.STORY_GENERATOR,
                    AgentType.QA_PLANNER, AgentType.REVIEW_AGENT
                ]
            }
            }
            print(f"[INIT] New session initialized successfully for {session_id}")
        except Exception as e:
            print(f"[ERROR] Failed to initialize session {session_id}: {e}")
            raise

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            print(f"[WEBSOCKET] Session {session_id} received: {message.get('type', 'no-type')} - {message.get('text', message.get('data', {}).get('message', 'no-text'))[:50]}...")
            handler = message_handlers.get(message.get("type"))
            
            if handler:
                await handler(session_id, message)
            else:
                # Handle default case - if no specific type, treat as standard prototype generation
                if "text" in message and not message.get("type"):
                    # Default to single-agent prototype generation for backward compatibility
                    await message_handlers["generate_prototype"](session_id, message)
                else:
                    print(f"Unknown message type: {message.get('type')}")
                    await manager.send_json_message({
                        "type": "error",
                        "message": f"Unknown message type: {message.get('type')}"
                    }, session_id)

    except WebSocketDisconnect:
        manager.disconnect(session_id)
        print(f"Client #{session_id} disconnected")
    except Exception as e:
        print(f"Error in WebSocket for session {session_id}: {e}")
        await manager.send_json_message({
            "type": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }, session_id)
