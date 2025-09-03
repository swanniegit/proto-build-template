import json
import asyncio
import openai
from typing import Dict, Any

from .manager import manager
from ..state import sessions
from ..models.agent_models import AgentType, MultiAgentWorkflow, ConversationContext, SharedAgentMemory, AgentResponse
from ..agents.base import DesignAgent
from ..agents.handoff_coordinator import HandoffCoordinator
from ..agents.memory import SessionMemory
from ..core.config import OPENAI_API_KEY
from ..models.api_models import DocumentResponse
from ..prompts.prompt_manager import prompt_manager
from ..services.template_agent_executor import template_agent_executor
from ..services.agent_template_service import agent_template_service
from ..models.agent_templates import AgentExecutionRequest
from ..llm.llm_manager import llm_manager
from ..llm.base_provider import LLMMessage, LLMProvider

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
            context_parts.append("")
    
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
        if (
            sessions[session_id].get('imported_documents') and 
            not sessions[session_id].get("current_request") and 
            not context_data.get("current_request") and 
            len(context_str_parts) < 2
        ):
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

async def handle_execute_template_agent(session_id: str, message: Dict[str, Any]):
    """Handles execution of a single template-based agent."""
    try:
        template_id = message["data"]["template_id"]
        user_input = message["data"]["user_input"]
        context = message["data"].get("context", {})
        
        # Add session context
        session_context = {
            "conversation_history": sessions[session_id].get("history", []),
            "current_prototype": sessions[session_id].get("current_prototype"),
            "session_preferences": sessions[session_id].get("memory", {}).get("preferences", {}) if sessions[session_id].get("memory") else {}
        }
        context.update(session_context)
        
        # Store the current request
        sessions[session_id]["current_request"] = user_input
        sessions[session_id]["history"].append(user_input)
        
        result = await template_agent_executor.execute_agent_template(
            template_id, user_input, context
        )
        
        await manager.send_json_message({
            "type": "template_agent_result",
            "data": {
                "result": result.dict(),
                "template_id": template_id
            }
        }, session_id)
        
    except Exception as e:
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to execute template agent: {str(e)}"
        }, session_id)

async def handle_execute_multiple_template_agents(session_id: str, message: Dict[str, Any]):
    """Handles execution of multiple template-based agents."""
    try:
        print(f"[DEBUG] Raw message received: {message}")
        template_ids = message["data"]["template_ids"]
        user_input = message["data"]["user_input"]
        context = message["data"].get("context", {})
        llm_settings = message["data"].get("llm_settings", {})
        
        print(f"[DEBUG] Template IDs: {template_ids}")
        print(f"[DEBUG] User input: '{user_input}' (length: {len(user_input) if user_input else 0})")
        print(f"[DEBUG] Context: {context}")
        print(f"[DEBUG] LLM Settings: {llm_settings}")
        
        # Add session context
        session_data = sessions[session_id]
        memory = session_data.get("memory")
        session_context = {
            "conversation_history": session_data.get("history", []),
            "current_prototype": session_data.get("current_prototype"),
            "session_preferences": memory.preferences if memory else {}
        }
        context.update(session_context)
        
        # Store the current request
        sessions[session_id]["current_request"] = user_input
        sessions[session_id]["history"].append(user_input)
        
        results = await template_agent_executor.execute_multiple_templates(
            template_ids, user_input, context, llm_settings=llm_settings
        )
        
        await manager.send_json_message({
            "type": "multiple_template_agents_result",
            "data": {
                "results": [result.dict() for result in results],
                "user_input": user_input,
                "execution_count": len(results)
            }
        }, session_id)
        
    except Exception as e:
        await manager.send_json_message({
            "type": "error",
            "message": f"Failed to execute multiple template agents: {str(e)}"
        }, session_id)

async def handle_get_agent_templates(session_id: str, message: Dict[str, Any]):
    """Handles getting all available agent templates."""
    try:
        collection = agent_template_service.get_all_templates()
        
        await manager.send_json_message({
            "type": "agent_templates",
            "data": {
                "templates": [template.dict() for template in collection.templates],
                "active_templates": collection.active_templates
            }
        }, session_id)
        
    except Exception as e:
        await manager.send_json_message({
            "type": "error", 
            "message": f"Failed to get agent templates: {str(e)}"
        }, session_id)

async def handle_execute_llm_agents(session_id: str, message: Dict[str, Any]):
    """Handles execution of multiple LLM-based agents for workspace analysis."""
    try:
        print(f"[LLM-AGENTS] Session {session_id}: Executing LLM-based agents")
        
        user_input = message["data"]["user_input"]
        template_ids = message["data"]["template_ids"]
        llm_settings = message["data"].get("llm_settings", {})
        
        # Extract LLM settings
        provider_str = llm_settings.get("provider", "openai")
        model = llm_settings.get("model", "gpt-4o-mini")
        temperature = llm_settings.get("temperature", 0.7)
        
        # Convert provider string to enum
        try:
            provider = LLMProvider(provider_str)
        except ValueError:
            provider = LLMProvider.OPENAI
            print(f"[WARNING] Invalid provider '{provider_str}', using OpenAI")
        
        # Store request in session
        sessions[session_id]["current_request"] = user_input
        sessions[session_id]["history"].append(user_input)
        
        # Load actual agent templates from the database
        try:
            from ..services.agent_template_service import agent_template_service
            template_collection = agent_template_service.get_all_templates()
            agent_templates = {t.id: t for t in template_collection.templates if t.is_active}
            print(f"[DEBUG] Loaded {len(agent_templates)} active agent templates")
            print(f"[DEBUG] Template IDs: {list(agent_templates.keys())}")
            print(f"[DEBUG] Requested template IDs: {template_ids}")
        except Exception as e:
            print(f"[ERROR] Failed to load agent templates: {e}")
            agent_templates = {}
        
        # Create async tasks for parallel execution
        async def execute_agent(template_id: str):
            if template_id not in agent_templates:
                print(f"[ERROR] Template {template_id} not found in agent_templates")
                return None
                
            try:
                print(f"[DEBUG] Starting execution of agent: {template_id}")
                template = agent_templates[template_id]
                agent_name = template.name
                agent_prompt = template.prompt
                print(f"[DEBUG] Agent {agent_name} loaded, prompt length: {len(agent_prompt)}")
                
                # Create messages for this agent
                messages = [
                    LLMMessage(role="system", content=f"{agent_prompt}\n\nProvide your analysis in the following format:\n1. Main Analysis (2-3 paragraphs)\n2. Specific Suggestions (bullet points)\n3. Questions to Consider (bullet points)\n4. Confidence Level (0-100%)"),
                    LLMMessage(role="user", content=f"Analyze this request from your expertise perspective: {user_input}")
                ]
                
                # Generate response using selected LLM
                print(f"[DEBUG] Calling LLM for {agent_name}: {provider} {model}")
                
                try:
                    response = await llm_manager.generate(
                        messages=messages,
                        model=model,
                        provider=provider,
                        temperature=temperature,
                        max_tokens=1500
                    )
                    print(f"[DEBUG] LLM response received for {agent_name}: {len(response.content)} chars")
                except Exception as llm_error:
                    print(f"[DEBUG] Primary LLM failed for {agent_name}: {llm_error}")
                    # Fallback to OpenAI if selected provider fails
                    if provider != LLMProvider.OPENAI:
                        print(f"[DEBUG] Falling back to OpenAI for {agent_name}")
                        response = await llm_manager.generate(
                            messages=messages,
                            model="gpt-4o-mini",
                            provider=LLMProvider.OPENAI,
                            temperature=temperature,
                            max_tokens=1500
                        )
                        print(f"[DEBUG] Fallback LLM response received for {agent_name}: {len(response.content)} chars")
                    else:
                        raise llm_error
                
                # Parse the response into structured format
                content = response.content
                
                # Extract suggestions and questions (basic parsing)
                suggestions = []
                questions = []
                alternative_ideas = []
                rerun_results = []
                
                if "Suggestions:" in content or "suggestions:" in content:
                    suggestion_section = content.split("uggestions:")[-1].split("Questions:")[0] if "Questions:" in content else content.split("uggestions:")[-1]
                    suggestions = [line.strip().lstrip("•-* ") for line in suggestion_section.split("\n") if line.strip() and line.strip().startswith(("•", "-", "*", "1.", "2.", "3."))]
                
                if "Questions:" in content or "questions:" in content:
                    question_section = content.split("uestions:")[-1]
                    questions = [line.strip().lstrip("•-* ") for line in question_section.split("\n") if line.strip() and line.strip().startswith(("•", "-", "*", "1.", "2.", "3."))]
                
                # Special parsing for Multi-Perspective Analyst
                if template_id == "rerun_default":
                    # Extract the 5 perspectives from the content
                    perspectives = []
                    perspective_markers = ["STRATEGIC PERSPECTIVE", "USER-CENTRIC PERSPECTIVE", "INNOVATION PERSPECTIVE", "RISK & COMPLIANCE PERSPECTIVE", "IMPLEMENTATION PERSPECTIVE"]
                    
                    for i, marker in enumerate(perspective_markers):
                        if marker in content:
                            start_pos = content.find(marker)
                            if i < len(perspective_markers) - 1:
                                next_marker = perspective_markers[i + 1]
                                end_pos = content.find(next_marker)
                                if end_pos == -1:
                                    end_pos = len(content)
                            else:
                                end_pos = len(content)
                            
                            perspective_content = content[start_pos:end_pos].strip()
                            if perspective_content:
                                perspectives.append(f"{marker}:\n{perspective_content}")
                    
                    rerun_results = perspectives[:5]  # Ensure max 5 perspectives
                
                # Extract confidence level
                confidence_level = 0.8  # Default
                if "confidence" in content.lower():
                    import re
                    conf_match = re.search(r'(\d+)%', content)
                    if conf_match:
                        confidence_level = int(conf_match.group(1)) / 100.0
                
                # Create result object
                result = {
                    "template_id": template_id,
                    "agent_name": agent_name,
                    "content": content,
                    "suggestions": suggestions[:5],  # Limit to 5 suggestions
                    "questions": questions[:5],      # Limit to 5 questions
                    "confidence_level": confidence_level,
                    "execution_time": response.response_time or 1.0,
                    "alternative_ideas": alternative_ideas[:5],
                    "rerun_results": rerun_results[:5]
                }
                
                # Send individual result as it completes
                await manager.send_json_message({
                    "type": "template_agent_result",
                    "data": {
                        "result": result,
                        "template_id": template_id
                    }
                }, session_id)
                
                return result
                
            except Exception as e:
                print(f"[ERROR] Failed to execute agent {template_id}: {e}")
                print(f"[ERROR] Error type: {type(e).__name__}")
                print(f"[ERROR] LLM settings: provider={provider}, model={model}")
                import traceback
                traceback.print_exc()
                
                # Send error result
                template = agent_templates.get(template_id)
                agent_name = template.name if template else template_id.replace("_", " ").title()
                
                error_result = {
                    "template_id": template_id,
                    "agent_name": agent_name,
                    "content": f"Error executing agent: {str(e)}",
                    "suggestions": [],
                    "questions": [],
                    "confidence_level": 0.0,
                    "execution_time": response_time,
                    "alternative_ideas": [],
                    "rerun_results": []
                }
                
                await manager.send_json_message({
                    "type": "template_agent_result",
                    "data": {
                        "result": error_result,
                        "template_id": template_id
                    }
                }, session_id)
                
                return error_result
        
        # Execute all agents in parallel
        print(f"[LLM-AGENTS] Starting parallel execution of {len(template_ids)} agents")
        tasks = [execute_agent(template_id) for template_id in template_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out None results and exceptions
        valid_results = [r for r in results if r is not None and not isinstance(r, Exception)]
        
        # Send final completion message
        await manager.send_json_message({
            "type": "multiple_template_agents_result",
            "data": {
                "results": valid_results,
                "user_input": user_input,
                "execution_count": len(valid_results)
            }
        }, session_id)
        
        print(f"[LLM-AGENTS] Successfully executed {len(valid_results)} agents in parallel for session {session_id}")
        
    except Exception as e:
        print(f"[ERROR] LLM agents execution failed: {str(e)}")
        await manager.send_json_message({
            "type": "error",
            "message": f"LLM agents execution failed: {str(e)}"
        }, session_id)

async def handle_generate_prototype(session_id: str, message: Dict[str, Any]):
    """Handles prototype generation using the selected LLM."""
    try:
        print(f"[PROTOTYPE] Session {session_id}: Generating prototype")
        
        user_input = message["data"]["text"]
        llm_settings = message["data"].get("llm_settings", {})
        context = message["data"].get("context", {})
        
        # Extract LLM settings
        provider_str = llm_settings.get("provider", "openai")
        model = llm_settings.get("model", "gpt-4o-mini")
        temperature = llm_settings.get("temperature", 0.7)
        
        # Convert provider string to enum
        try:
            provider = LLMProvider(provider_str)
        except ValueError:
            provider = LLMProvider.OPENAI
            print(f"[WARNING] Invalid provider '{provider_str}', using OpenAI")
        
        # Store request in session
        sessions[session_id]["current_request"] = user_input
        sessions[session_id]["history"].append(user_input)
        
        # Build prompt for UI generation
        system_prompt = """You are an expert UI/UX designer that converts natural language descriptions into interactive React component JSON structures.

Generate a JSON object that represents a React component structure with the following format:
{
  "component": "div",
  "props": {
    "className": "p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-lg"
  },
  "children": [
    {
      "component": "h1",
      "props": {"className": "text-3xl font-bold text-gray-800 mb-4"},
      "text": "Title Here"
    }
  ]
}

Rules:
1. Use semantic HTML components (div, h1-h6, p, button, input, form, img, span, label)
2. Apply modern Tailwind CSS classes for styling
3. Make interactive elements functional (buttons, forms, inputs)
4. Create responsive, modern designs
5. Only return the JSON object, no markdown or additional text
6. Ensure proper nesting and structure

Available components: div, button, input, form, h1, h2, h3, h4, h5, h6, p, span, label, img"""

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=f"Create a UI component for: {user_input}")
        ]
        
        # Generate prototype using selected LLM
        response = await llm_manager.generate(
            messages=messages,
            model=model,
            provider=provider,
            temperature=temperature,
            max_tokens=2000
        )
        
        # Parse the JSON response
        prototype_json = None
        try:
            # Try to extract JSON from response
            content = response.content.strip()
            
            # Handle markdown wrapped JSON
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            prototype_json = json.loads(content.strip())
            
        except json.JSONDecodeError as e:
            print(f"[ERROR] Failed to parse JSON: {e}")
            # Fallback to simple structure
            prototype_json = {
                "component": "div",
                "props": {"className": "p-8 text-center bg-gray-100 rounded-lg"},
                "children": [
                    {
                        "component": "h2",
                        "props": {"className": "text-2xl font-bold text-red-600 mb-4"},
                        "text": "Generation Error"
                    },
                    {
                        "component": "p",
                        "props": {"className": "text-gray-700"},
                        "text": "Failed to parse AI response. Please try again with a simpler description."
                    }
                ]
            }
        
        # Store prototype in session
        sessions[session_id]["current_prototype"] = prototype_json
        
        await manager.send_json_message({
            "type": "prototype",
            "data": prototype_json
        }, session_id)
        
        print(f"[PROTOTYPE] Successfully generated prototype for session {session_id}")
        
    except Exception as e:
        print(f"[ERROR] Prototype generation failed: {str(e)}")
        await manager.send_json_message({
            "type": "error",
            "message": f"Prototype generation failed: {str(e)}"
        }, session_id)


message_handlers = {
    "multi_agent_prototype": handle_multi_agent_prototype,
    "switch_agent": handle_switch_agent,
    "import_documents": handle_import_documents,
    "direct_chat": handle_direct_chat,
    "get_prompts": handle_get_prompts,
    "save_prompt": handle_save_prompt,
    "execute_template_agent": handle_execute_template_agent,
    "execute_multiple_template_agents": handle_execute_multiple_template_agents,
    "execute_llm_agents": handle_execute_llm_agents,
    "get_agent_templates": handle_get_agent_templates,
    "generate_prototype": handle_generate_prototype,
}