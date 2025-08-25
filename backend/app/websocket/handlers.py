import json
import asyncio
import openai
from typing import Dict, Any

from .manager import manager
from ..state import sessions
from ..models.agent_models import AgentType, MultiAgentWorkflow, ConversationContext, SharedAgentMemory, AgentResponse
from ..agents.base import DesignAgent, StoriesAndQAAgent
from ..agents.handoff_coordinator import HandoffCoordinator
from ..agents.memory import SessionMemory
from ..core.config import OPENAI_API_KEY
from ..models.api_models import DocumentResponse
from ..prototype.generator import generate_prototype_v3
from ..prompts.prompt_manager import prompt_manager

async def handle_multi_agent_prototype(session_id: str, message: Dict[str, Any]):
    """Handles the main multi-agent prototyping logic."""
    try:
        print(f"[MULTI-AGENT] Session {session_id}: '{message['text']}'")
    except UnicodeEncodeError:
        print(f"[MULTI-AGENT] Session {session_id}: [Contains Unicode characters - length: {len(message['text'])}]")

    # Store the current request in session for agent context
    sessions[session_id]["current_request"] = message['text']
    
    # Add to history for session memory
    sessions[session_id]["history"].append(message['text'])

    current_workflow = sessions[session_id]["multi_agent_workflow"]
    current_agent_type = current_workflow.current_agent

    if message.get("single_agent_mode", False) or current_agent_type in [AgentType.DEVELOPER, AgentType.PRODUCT_MANAGER]:
        print(f"Single agent mode: Using only {current_agent_type}")
        agent_responses = await process_single_agent(
            message["text"],
            sessions[session_id],
            current_agent_type
        )
    else:
        print("Enhanced multi-agent workflow mode")
        agent_responses = await process_enhanced_multi_agent_workflow(
            message["text"],
            sessions[session_id]
        )

    response_data = {
        "type": "multi_agent_response",
        "data": {
            "agent_responses": [response.model_dump() for response in agent_responses],
            "current_prototype": sessions[session_id].get("current_prototype", None)
        }
    }
    await manager.send_json_message(response_data, session_id)

async def process_single_agent(user_input: str, session: Dict[str, Any], agent_type: AgentType):
    """Processes a request using a single agent."""
    agent = session["agents"][agent_type]
    
    # Build comprehensive context including current request
    context_parts = [
        f"CURRENT REQUEST: {user_input}",
        ""
    ]
    
    # Add session history
    if session.get('history'):
        context_parts.append("CONVERSATION HISTORY:")
        for i, hist in enumerate(session['history'][-5:]):  # Last 5 history items
            context_parts.append(f"{i+1}. {hist}")
        context_parts.append("")
    
    # Add current prototype state
    if session.get('current_prototype'):
        context_parts.append("CURRENT PROTOTYPE STATE:")
        context_parts.append(json.dumps(session['current_prototype'], indent=2))
        context_parts.append("")
    
    # Add learned preferences from memory
    if session.get('memory'):
        memory_context = session['memory'].get_context_summary()
        if memory_context and memory_context != "No learned preferences yet.":
            context_parts.append("LEARNED USER PREFERENCES:")
            context_parts.append(memory_context)
            context_parts.append("")
    
    context = "\n".join(context_parts)
    
    response = await agent.process(user_input, session.get('current_prototype', {}), context)
    return [response]

async def process_enhanced_multi_agent_workflow(user_input: str, session: Dict[str, Any]):
    """Processes a request using the enhanced multi-agent workflow with HandoffCoordinator."""
    handoff_coordinator = session["handoff_coordinator"]
    shared_memory = session["shared_memory"]
    
    # Build comprehensive session context
    session_context_parts = []
    
    # Add session history
    if session.get('history'):
        session_context_parts.append("CONVERSATION HISTORY:")
        for i, hist in enumerate(session['history'][-5:]):
            session_context_parts.append(f"{i+1}. {hist}")
        session_context_parts.append("")
    
    # Add current prototype state
    if session.get('current_prototype'):
        session_context_parts.append("CURRENT PROTOTYPE STATE:")
        session_context_parts.append(json.dumps(session['current_prototype'], indent=2))
        session_context_parts.append("")
    
    # Add learned preferences from memory
    if session.get('memory'):
        memory_context = session['memory'].get_context_summary()
        if memory_context and memory_context != "No learned preferences yet.":
            session_context_parts.append("LEARNED USER PREFERENCES:")
            session_context_parts.append(memory_context)
            session_context_parts.append("")
    
    session_context = "\n".join(session_context_parts)
    
    # Update shared memory context
    turn = {"user_input": user_input, "agent_responses": [], "session_context": session_context}
    # shared_memory.conversation_context.turns.append(turn)

    handoff_decision = handoff_coordinator.evaluate_handoff_needs(
        user_input,
        session["multi_agent_workflow"].current_agent,
        session["multi_agent_workflow"].agent_responses[-3:]  # Recent responses
    )

    assignments = handoff_coordinator.create_workload_assignments(handoff_decision, user_input)
    
    agent_responses = []
    for assignment in assignments:
        agent = session["agents"][assignment.agent_type]
        peer_assignments = [a for a in assignments if a.agent_type != assignment.agent_type]
        
        # Create enriched context that includes session context
        base_enriched_context = handoff_coordinator.create_enriched_context(
            assignment.agent_type,
            user_input,
            assignment,
            peer_assignments
        )
        
        # Add session context to the enriched context
        full_context = f"{session_context}\n\n{base_enriched_context}"
        
        response = await agent.process_enhanced(user_input, full_context, assignment)
        agent_responses.append(response)

    # Update workflow with responses
    session["multi_agent_workflow"].agent_responses.extend(agent_responses)

    if handoff_decision.requires_synthesis:
        synthesis_result = handoff_coordinator.synthesize_responses(agent_responses, user_input)
        print(f"Synthesis complete: {synthesis_result['coordination_summary']}")

    return agent_responses


async def handle_switch_agent(session_id: str, message: Dict[str, Any]):
    """Handles switching the active agent."""
    try:
        agent_type = AgentType(message["agent"])
        sessions[session_id]["multi_agent_workflow"].current_agent = agent_type
        await manager.send_json_message({
            "type": "agent_switched",
            "data": {"current_agent": agent_type.value}
        }, session_id)
    except ValueError:
        await manager.send_json_message({
            "type": "error",
            "message": f"Invalid agent type: {message.get('agent')}. Valid types: {[agent.value for agent in AgentType]}"
        }, session_id)

async def handle_import_documents(session_id: str, message: Dict[str, Any]):
    """Handles importing documents."""
    try:
        documents = message["data"]["documents"]
        sessions[session_id]["imported_documents"].extend(documents)
        if sessions[session_id].get("shared_memory") and sessions[session_id]["shared_memory"].conversation_context:
            sessions[session_id]["shared_memory"].conversation_context.imported_documents.extend(documents)
        
        await manager.send_json_message({
            "type": "documents_imported",
            "data": {
                "imported_count": len(documents),
                "total_documents": len(sessions[session_id]["imported_documents"])
            }
        }, session_id)
    except Exception as e:
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to import documents: {str(e)}"
        }, session_id)

async def handle_direct_chat(session_id: str, message: Dict[str, Any]):
    """Handles direct chat with a specific agent."""
    try:
        print(f"[DIRECT-CHAT] Session {session_id} received direct chat request")
        agent_type = AgentType(message["data"]["agent_type"])
        user_message = message["data"]["message"]
        context_data = message["data"].get("context", {})
        print(f"[DIRECT-CHAT] Agent: {agent_type}, Message: '{user_message}'")
        
        agent = sessions[session_id]["agents"][agent_type]
        
        context_str_parts = []
        
        # PRIORITY 1: Add current request from session (most recent context)
        current_req_from_session = sessions[session_id].get("current_request")
        print(f"[DEBUG] Session {session_id} current_request: {current_req_from_session}")
        print(f"[DEBUG] Context data keys: {list(context_data.keys())}")
        
        if current_req_from_session:
            context_str_parts.append(f"CURRENT SESSION CONTEXT:\n")
            context_str_parts.append(f"Latest Request: {current_req_from_session}\n")
            context_str_parts.append("\n")
        
        # PRIORITY 2: Add current request/main topic from message context
        if context_data.get("current_request") or context_data.get("main_topic"):
            current_req = context_data.get("current_request", "")
            main_topic = context_data.get("main_topic", "")
            context_str_parts.append(f"MESSAGE CONTEXT:\n")
            if current_req:
                context_str_parts.append(f"Current Request: {current_req}\n")
            if main_topic:
                context_str_parts.append(f"{main_topic}\n")
            context_str_parts.append("\n")
        
        # PRIORITY 3: Add recent session history (most relevant)
        if sessions[session_id]["history"]:
            context_str_parts.append("RECENT SESSION HISTORY:\n")
            context_str_parts.append("\n".join([f"User said: {h}" for h in sessions[session_id]["history"][-3:]]))
            context_str_parts.append("\n")
        
        # PRIORITY 4: Add agent responses context for continuity
        if context_data.get("agent_responses") and len(context_data["agent_responses"]) > 0:
            context_str_parts.append("PREVIOUS MULTI-AGENT DISCUSSION:\n")
            for response in context_data["agent_responses"][-3:]:
                agent_name = response.get("agent_type", "Agent").replace("_", " ").title()
                content_preview = response.get("response", {}).get("response", "")[:200]
                context_str_parts.append(f"{agent_name}: {content_preview}...\n")
            context_str_parts.append("\n")
        
        # PRIORITY 5: Add direct conversation history (if available)
        if context_data.get("conversation_history"):
            context_str_parts.append("DIRECT CONVERSATION HISTORY:\n")
            for msg in context_data["conversation_history"][-5:]:
                role = "User" if msg["role"] == "user" else agent_type.value.replace("_", " ").title()
                context_str_parts.append(f"{role}: {msg['content']}\n")
            context_str_parts.append("\n")
        
        # PRIORITY 6: Add imported documents ONLY if no current context exists
        if (sessions[session_id].get('imported_documents') and 
            not sessions[session_id].get("current_request") and 
            not context_data.get("current_request") and 
            len(context_str_parts) < 2):
            context_str_parts.append("REFERENCE DOCUMENTS (BACKGROUND):\n")
            total_doc_chars = 0
            max_doc_chars = 3000  # Further reduced to prevent context pollution
            
            for i, doc in enumerate(sessions[session_id]['imported_documents'][-1:]):  # Only last 1 doc
                context_str_parts.append(f"Document: {doc['name']} ({doc['type']})\n")
                
                # Only show document title and brief summary
                context_str_parts.append(f"Brief Summary: {doc['content'][:200]}...\n\n")
                break  # Only one document as background context

        context_str = "\n".join(context_str_parts)

        response_content = await agent.direct_chat(user_message, context_str)
        
        await manager.send_json_message({
            "type": "direct_chat_response",
            "data": {
                "agent_type": agent_type.value,
                "response": response_content
            }
        }, session_id)

    except Exception as e:
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to process direct chat: {str(e)}"
        }, session_id)

async def generate_prd(prompt: str):
    """Generate PRD from prompt using GPT-5 Responses API"""
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.responses.create(
            model="gpt-5",
            instructions="You are a product manager. Generate comprehensive PRDs in markdown format.",
            input=prompt,
            text={"format": {"type": "json_schema", "json_schema": {"schema": DocumentResponse.model_json_schema(), "strict": True}}},)
        result = json.loads(response.output_text)
        return result.get("content", response.output_text)
    except Exception as e:
        print(f"Error generating PRD with GPT-5 Responses API: {e}")
        # Fallback to Chat Completions
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                messages=[
                    {"role": "system", "content": "You are a product manager. Generate comprehensive PRDs in markdown format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as fallback_e:
            print(f"Fallback PRD generation failed: {fallback_e}")
            return f"Error generating PRD: {str(e)}"

async def handle_generate_prd(session_id: str, message: Dict[str, Any]):
    """Handles the request to generate a PRD from agent responses."""
    # Try to get agent_responses from the message data first
    agent_responses = message.get("data", {}).get("agent_responses", [])

    # If not provided in the message, try to retrieve from the session's workflow history
    if not agent_responses and session_id in sessions:
        workflow = sessions[session_id].get("multi_agent_workflow")
        if workflow and workflow.agent_responses:
            # Assuming workflow.agent_responses stores the latest responses
            agent_responses = workflow.agent_responses

    if agent_responses:
        agent_text = "\n\n".join([f"Agent {resp.get('agent_type', 'Unknown')}: {resp.get('content', '')}" 
                                 for resp in agent_responses])
        prd_content = await generate_prd(agent_text)
        await manager.send_json_message({
            "type": "prd_extracted",
            "data": {"content": prd_content}
        }, session_id)
    else:
        await manager.send_json_message({
            "type": "error",
            "message": "No agent responses provided for PRD generation"
        }, session_id)

async def generate_design_doc(prompt: str):
    """Generate design document from prompt using GPT-5 Responses API"""
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.responses.create(
            model="gpt-5",
            instructions="You are a UX/UI designer. Generate comprehensive design documentation in markdown format.",
            input=prompt,
            text={"format": {"type": "json_schema", "json_schema": {"schema": DocumentResponse.model_json_schema(), "strict": True}}},)
        result = json.loads(response.output_text)
        return result.get("content", response.output_text)
    except Exception as e:
        print(f"Error generating design doc with GPT-5 Responses API: {e}")
        # Fallback to Chat Completions
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                messages=[
                    {"role": "system", "content": "You are a UX/UI designer. Generate comprehensive design documentation in markdown format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as fallback_e:
            print(f"Fallback design doc generation failed: {fallback_e}")
            return f"Error generating design doc: {str(e)}"

async def handle_generate_design_doc(session_id: str, message: Dict[str, Any]):
    """Handles the request to generate a design document."""
    design_doc_content = await generate_design_doc(message["text"])
    await manager.send_json_message({
        "type": "design_doc",
        "data": design_doc_content
    }, session_id)

async def handle_stories_qa_request(session_id: str, message: Dict[str, Any]):
    """Handles Stories & QA Planning requests."""
    try:
        print(f"[STORIES-QA] Session {session_id} received stories_qa_request")
        user_input = message["data"]["user_input"]
        prd_content = message["data"].get("prd_content", "")
        context = message["data"].get("context", {})
        
        # Clean input of problematic characters
        user_input = user_input.encode('utf-8', errors='ignore').decode('utf-8')
        prd_content = prd_content.encode('utf-8', errors='ignore').decode('utf-8')
        
        print(f"[STORIES-QA] User input: '{user_input}'")
        print(f"[STORIES-QA] PRD content length: {len(prd_content)} chars")
        print(f"[STORIES-QA] PRD content preview: {prd_content[:200] if prd_content else 'EMPTY'}")
        
        agent_responses = []
        agents = sessions[session_id]["stories_qa_agents"]
        
        # Get focused agent from message data or default to Epic Generator
        focused_agent_type = message["data"].get("focused_agent", "epic_generator")
        
        # Map string to AgentType enum
        agent_type_map = {
            "epic_generator": AgentType.EPIC_GENERATOR,
            "story_generator": AgentType.STORY_GENERATOR,
            "qa_planner": AgentType.QA_PLANNER,
            "review_agent": AgentType.REVIEW_AGENT
        }
        
        agent_type = agent_type_map.get(focused_agent_type, AgentType.EPIC_GENERATOR)
        selected_agent = agents[agent_type]
        
        try:
            print(f"[STORIES-QA] Processing with {agent_type.value}")
            response_content = await selected_agent.process_request(
                user_input, 
                str(context), 
                prd_content
            )
            agent_responses.append(response_content)
            print(f"[STORIES-QA] {agent_type.value} completed successfully")
        except Exception as e:
            print(f"[STORIES-QA] Error processing {agent_type.value} request: {e}")
            agent_responses.append({
                "agent_type": agent_type.value,
                "response": f"Error: {str(e)}"
            })
        
        await manager.send_json_message({
            "type": "stories_qa_response",
            "data": {"agent_responses": agent_responses}
        }, session_id)

    except Exception as e:
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to process stories_qa_request: {str(e)}"
        }, session_id)

async def handle_single_agent_prototype(session_id: str, message: Dict[str, Any]):
    """Handles single-agent prototype generation (for Single Agent Prototyper UI)."""
    try:
        user_input = message["text"]
        session = sessions[session_id]
        
        # Add to history
        session["history"].append(user_input)
        
        # Store previous prototype for learning
        previous_prototype = session.get("current_prototype", {}).copy() if session.get("current_prototype") else {}
        
        print(f"Generating single-agent prototype for: {user_input}")
        
        # Generate prototype using GPT-5 Responses API
        prototype, response_id = await generate_prototype_v3(
            user_input,
            session["history"],
            session.get("current_prototype", {}),
            session.get("previous_response_id")
        )
        
        # Update session with new response ID
        session["previous_response_id"] = response_id
        print(f"Generated prototype: {type(prototype)}")
        
        # Learn from changes
        if "memory" in session:
            session["memory"].learn_from_change(
                previous_prototype, 
                prototype, 
                user_input
            )
            
            # Apply learned preferences
            prototype = session["memory"].apply_learned_preferences(prototype)
        
        # Store and send back
        session["current_prototype"] = prototype
        await manager.send_json_message({
            "type": "prototype",
            "data": prototype
        }, session_id)
        
    except Exception as e:
        print(f"Error in single-agent prototype generation: {e}")
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to generate prototype: {str(e)}"
        }, session_id)

async def handle_get_prompts(session_id: str, message: Dict[str, Any]):
    """Handles getting all available prompts."""
    try:
        print(f"[PROMPTS] Loading prompts for session {session_id}")
        prompts = prompt_manager.list_prompts()
        print(f"[PROMPTS] Found {len(prompts)} prompts: {list(prompts.keys())}")
        await manager.send_json_message({
            "type": "prompts_list",
            "data": {"prompts": prompts}
        }, session_id)
    except Exception as e:
        print(f"[PROMPTS] Error getting prompts: {e}")
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to get prompts: {str(e)}"
        }, session_id)

async def handle_save_prompt(session_id: str, message: Dict[str, Any]):
    """Handles saving a prompt."""
    try:
        prompt_name = message["data"]["prompt_name"]
        content = message["data"]["content"]
        
        success = prompt_manager.save_prompt(prompt_name, content)
        
        if success:
            await manager.send_json_message({
                "type": "prompt_saved",
                "data": {"prompt_name": prompt_name, "success": True}
            }, session_id)
        else:
            await manager.send_json_message({
                "type": "error",
                "message": f"Failed to save prompt: {prompt_name}"
            }, session_id)
    except Exception as e:
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to save prompt: {str(e)}"
        }, session_id)


message_handlers = {
    "multi_agent_prototype": handle_multi_agent_prototype,
    "switch_agent": handle_switch_agent,
    "import_documents": handle_import_documents,
    "direct_chat": handle_direct_chat,
    "generate_prd": handle_generate_prd,
    "generate_design_doc": handle_generate_design_doc,
    "stories_qa_request": handle_stories_qa_request,
    "get_prompts": handle_get_prompts,
    "save_prompt": handle_save_prompt,
    # Default handler for standard prototype generation (single-agent mode)
    "generate_prototype": handle_single_agent_prototype,
}
