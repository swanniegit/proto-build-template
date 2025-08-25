from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import openai
import json
import os
from dotenv import load_dotenv
from datetime import datetime
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
from enum import Enum

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Pydantic models for structured outputs
class PrototypeComponent(BaseModel):
    component: str
    props: Optional[Dict[str, Any]] = None
    children: Optional[List['PrototypeComponent']] = None
    text: Optional[str] = None

class MultiScreenPrototype(BaseModel):
    screens: List[PrototypeComponent]

class SinglePrototype(BaseModel):
    component: str
    props: Optional[Dict[str, Any]] = None
    children: Optional[List[PrototypeComponent]] = None
    text: Optional[str] = None

class DocumentResponse(BaseModel):
    content: str

# Update forward reference for self-referencing model
PrototypeComponent.model_rebuild()

# Multi-Agent System Classes
class AgentType(str, Enum):
    UI_DESIGNER = "ui_designer"
    UX_RESEARCHER = "ux_researcher"
    DEVELOPER = "developer"
    PRODUCT_MANAGER = "product_manager"

class AgentResponse(BaseModel):
    agent_type: AgentType
    content: str
    suggestions: List[str] = []
    critique: Optional[str] = None
    handoff_to: Optional[AgentType] = None
    prototype_update: Optional[Dict[str, Any]] = None

class MultiAgentWorkflow(BaseModel):
    session_id: str
    current_agent: AgentType
    agent_responses: List[AgentResponse] = []
    current_prototype: Optional[Dict[str, Any]] = None
    workflow_stage: str = "initial"

class DesignAgent:
    def __init__(self, agent_type: AgentType, model: str = "gpt-5"):
        self.agent_type = agent_type
        self.model = model
        self.instructions = self._get_instructions()
    
    def _get_instructions(self) -> str:
        instructions = {
            AgentType.UI_DESIGNER: """You are a UI Designer Agent specialized in visual design and layout.
            Focus on: Visual hierarchy, color schemes, typography, spacing, layout patterns, component design.
            Analyze user requests and existing prototypes from a visual design perspective.
            Provide specific design recommendations and critique visual aspects.""",
            
            AgentType.UX_RESEARCHER: """You are a UX Researcher Agent specialized in user experience and usability.
            Focus on: User flows, accessibility, usability principles, interaction patterns, user needs analysis.
            Evaluate prototypes for user experience quality and provide usability insights.
            Suggest improvements based on UX best practices.""",
            
            AgentType.DEVELOPER: """You are a Developer Agent specialized in technical implementation and feasibility.
            Focus on: Code structure, component architecture, performance, maintainability, technical constraints.
            Assess technical feasibility of designs and suggest implementation approaches.
            Ensure generated prototypes follow development best practices.""",
            
            AgentType.PRODUCT_MANAGER: """You are a Product Manager Agent specialized in business requirements and product strategy.
            Focus on: User needs, business goals, feature prioritization, product requirements, market considerations.
            Evaluate prototypes against business objectives and user requirements.
            Provide strategic product insights and feature recommendations."""
        }
        return instructions[self.agent_type]
    
    async def process(self, user_input: str, current_prototype: Dict[str, Any], context: str) -> AgentResponse:
        """Process user input and current prototype through this agent's lens"""
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            prompt = f"""
AGENT ROLE: {self.instructions}

CURRENT PROTOTYPE:
{json.dumps(current_prototype, indent=2) if current_prototype else "No prototype yet"}

CONTEXT:
{context}

USER REQUEST:
{user_input}

TASK: Analyze the user request and current prototype from your specialized perspective. Provide:
1. Your expert commentary on the request/prototype
2. 3-5 specific suggestions for improvement
3. A critique of current design (if applicable)
4. Whether to handoff to another agent (ui_designer, ux_researcher, developer, product_manager, or none)
5. Any prototype updates you recommend

Respond as JSON matching the AgentResponse schema."""

            response = client.responses.create(
                model=self.model,
                instructions=f"You are a {self.agent_type.value} providing expert analysis. Return valid JSON only.",
                input=prompt,
                text={"format": {"type": "json_schema", "json_schema": {"schema": AgentResponse.model_json_schema(), "strict": True}}},
                temperature=0.3
            )
            
            result = json.loads(response.output_text)
            return AgentResponse(**result)
            
        except Exception as e:
            print(f"Agent {self.agent_type} processing failed: {e}")
            return AgentResponse(
                agent_type=self.agent_type,
                content=f"Error in {self.agent_type.value} analysis: {str(e)}",
                suggestions=["Please try rephrasing your request"],
                critique="Unable to analyze due to processing error"
            )

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store conversation context (in-memory for now)
sessions = {}

class SessionMemory:
    def __init__(self):
        self.corrections = []
        self.preferences = {}
        self.component_history = []
    
    def learn_from_change(self, before, after, user_input):
        """Track what changed to learn patterns"""
        change = {
            "before": before,
            "after": after,
            "trigger": user_input,
            "timestamp": datetime.now().isoformat()
        }
        
        # Detect pattern type
        if "color" in user_input.lower():
            self.preferences["color_preference"] = self._extract_color(after)
        elif "button" in user_input.lower():
            self.preferences["button_style"] = self._extract_button_style(after)
        
        self.corrections.append(change)
    
    def _extract_color(self, prototype):
        """Extract color information from prototype"""
        # Simple color extraction logic
        if isinstance(prototype, dict) and "props" in prototype:
            style = prototype.get("props", {}).get("style", {})
            return style.get("color") or style.get("backgroundColor")
        return None
    
    def _extract_button_style(self, prototype):
        """Extract button style information"""
        if isinstance(prototype, dict) and prototype.get("component") == "button":
            return prototype.get("props", {}).get("style", {})
        return None
    
    def apply_learned_preferences(self, prototype):
        """Apply learned preferences to new prototypes"""
        if "color_preference" in self.preferences:
            # Apply learned color scheme
            prototype = self._apply_color_scheme(prototype, self.preferences["color_preference"])
        
        return prototype
    
    def _apply_color_scheme(self, prototype, color):
        """Apply color scheme to prototype"""
        if isinstance(prototype, dict):
            if "props" not in prototype:
                prototype["props"] = {}
            if "style" not in prototype["props"]:
                prototype["props"]["style"] = {}
            prototype["props"]["style"]["color"] = color
            
            # Apply to children
            if "children" in prototype:
                for child in prototype["children"]:
                    self._apply_color_scheme(child, color)
        
        return prototype

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # Initialize session
    if session_id not in sessions:
        sessions[session_id] = {
            "history": [],
            "current_prototype": {},
            "memory": SessionMemory(),
            "previous_response_id": None,  # For Responses API stateful conversations
            "multi_agent_workflow": MultiAgentWorkflow(
                session_id=session_id,
                current_agent=AgentType.UI_DESIGNER  # Start with UI Designer
            ),
            "agents": {
                AgentType.UI_DESIGNER: DesignAgent(AgentType.UI_DESIGNER),
                AgentType.UX_RESEARCHER: DesignAgent(AgentType.UX_RESEARCHER),
                AgentType.DEVELOPER: DesignAgent(AgentType.DEVELOPER),
                AgentType.PRODUCT_MANAGER: DesignAgent(AgentType.PRODUCT_MANAGER)
            }
        }
    
    try:
        while True:
            # Receive message from frontend
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Check message type
            if message.get("type") == "multi_agent_prototype":
                # Multi-agent prototype generation
                agent_responses = await process_multi_agent_workflow(
                    message["text"],
                    sessions[session_id]
                )
                await websocket.send_json({
                    "type": "multi_agent_response",
                    "data": {
                        "agent_responses": [response.model_dump() for response in agent_responses],
                        "current_prototype": sessions[session_id]["current_prototype"]
                    }
                })
                continue
            elif message.get("type") == "switch_agent":
                # Allow user to manually switch to a specific agent
                agent_type = AgentType(message["agent"])
                sessions[session_id]["multi_agent_workflow"].current_agent = agent_type
                await websocket.send_json({
                    "type": "agent_switched",
                    "data": {"current_agent": agent_type.value}
                })
                continue
            elif message.get("type") == "generate_prd":
                # Generate PRD
                prd_content = await generate_prd(message["text"])
                await websocket.send_json({
                    "type": "prd",
                    "data": prd_content
                })
                continue
            elif message.get("type") == "generate_design_doc":
                # Generate design document
                design_doc = await generate_design_doc(message["text"])
                await websocket.send_json({
                    "type": "design_doc",
                    "data": design_doc
                })
                continue
            
            # Add to history
            sessions[session_id]["history"].append(message["text"])
            
            # Store previous prototype for learning
            previous_prototype = sessions[session_id]["current_prototype"].copy()
            
            print(f"Generating prototype for: {message['text']}")
            # Generate prototype using GPT-5 Responses API
            prototype, response_id = await generate_prototype_v3(
                message["text"],
                sessions[session_id]["history"],
                sessions[session_id]["current_prototype"],
                sessions[session_id]["previous_response_id"]
            )
            
            # Update session with new response ID
            sessions[session_id]["previous_response_id"] = response_id
            print(f"Generated prototype: {type(prototype)}")
            
            # Learn from changes
            sessions[session_id]["memory"].learn_from_change(
                previous_prototype, 
                prototype, 
                message["text"]
            )
            
            # Apply learned preferences
            prototype = sessions[session_id]["memory"].apply_learned_preferences(prototype)
            
            # Store and send back
            sessions[session_id]["current_prototype"] = prototype
            await websocket.send_json({
                "type": "prototype",
                "data": prototype
            })
            
    except Exception as e:
        print(f"Error: {e}")

async def process_multi_agent_workflow(user_input: str, session_data: dict) -> List[AgentResponse]:
    """Process user input through multiple specialized agents"""
    workflow = session_data["multi_agent_workflow"]
    agents = session_data["agents"]
    current_prototype = session_data["current_prototype"]
    context = "\n".join([f"User said: {h}" for h in session_data["history"][-3:]])
    
    agent_responses = []
    
    try:
        # Start with current agent
        current_agent = agents[workflow.current_agent]
        response = await current_agent.process(user_input, current_prototype, context)
        agent_responses.append(response)
        
        # Update prototype if agent provided updates
        if response.prototype_update:
            session_data["current_prototype"].update(response.prototype_update)
        
        # If agent suggests handoff, process with that agent too
        max_handoffs = 3  # Prevent infinite loops
        handoff_count = 0
        
        while response.handoff_to and handoff_count < max_handoffs:
            handoff_count += 1
            next_agent = agents[response.handoff_to]
            
            # Add context from previous agent
            enhanced_context = f"{context}\n\n{workflow.current_agent.value} analysis: {response.content}"
            
            response = await next_agent.process(user_input, session_data["current_prototype"], enhanced_context)
            agent_responses.append(response)
            
            # Update current agent in workflow
            workflow.current_agent = response.agent_type
            
            # Update prototype if agent provided updates
            if response.prototype_update:
                session_data["current_prototype"].update(response.prototype_update)
        
        # Also get parallel insights from other agents (run in parallel)
        other_agents = [agent_type for agent_type in AgentType if agent_type not in [r.agent_type for r in agent_responses]]
        
        if other_agents and len(agent_responses) < 3:  # Don't overwhelm with too many responses
            parallel_tasks = []
            for agent_type in other_agents[:2]:  # Limit to 2 additional agents
                agent = agents[agent_type]
                task = agent.process(user_input, session_data["current_prototype"], context)
                parallel_tasks.append(task)
            
            if parallel_tasks:
                parallel_responses = await asyncio.gather(*parallel_tasks, return_exceptions=True)
                for response in parallel_responses:
                    if isinstance(response, AgentResponse):
                        agent_responses.append(response)
        
        # Update workflow
        workflow.agent_responses.extend(agent_responses)
        workflow.current_prototype = session_data["current_prototype"]
        
        return agent_responses
        
    except Exception as e:
        print(f"Multi-agent workflow error: {e}")
        # Return error response
        error_response = AgentResponse(
            agent_type=workflow.current_agent,
            content=f"Multi-agent processing error: {str(e)}",
            suggestions=["Please try rephrasing your request"],
            critique="Unable to process through multi-agent system"
        )
        return [error_response]

async def generate_prototype_v3(user_input, history, current_prototype, previous_response_id=None):
    """New version using GPT-5 Responses API"""
    
    # Build context from history
    context = "\n".join([f"User said: {h}" for h in history[-5:]])
    
    # Determine if user wants multi-screen or single screen
    wants_multi_screen = any(word in user_input.lower() for word in ['screens', 'multiple screens', 'navigation', 'pages'])
    
    instructions = """You are a UI prototype generator. You maintain and evolve a UI based on user requests.

INSTRUCTIONS:
1. If user says "add" or "include" - ADD to existing prototype
2. If user says "change" or "make it" - MODIFY existing elements  
3. If user says "remove" or "delete" - REMOVE elements
4. If user says "create" or "new" - START fresh
5. For multi-screen prototypes, create multiple screen components with navigation

IMPORTANT: 
- For interactive elements like buttons, use "action" property to describe behavior
- DO NOT include JavaScript code strings in props
- Use semantic HTML components (button, input, form, div, h1, h2, etc.)

Common patterns:
- Login form: email input, password input, submit button
- Card: div with border, padding, shadow
- Button: include "action" property describing the behavior
- Form: include "action" property describing form submission"""

    user_prompt = f"""CURRENT STATE:
{json.dumps(current_prototype, indent=2) if current_prototype else "Empty - no prototype yet"}

CONVERSATION HISTORY:
{context}

NEW REQUEST:
{user_input}

Generate the appropriate UI prototype structure as JSON."""

    try:
        print(f"Generating prototype with GPT-5 Responses API")
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        # Build request parameters
        request_params = {
            "model": "gpt-5",
            "instructions": instructions,
            "input": user_prompt,
            "temperature": 0.3
        }
        
        # Add previous response ID for stateful conversation if available
        if previous_response_id:
            request_params["previous_response_id"] = previous_response_id
            print(f"Using previous response ID for context: {previous_response_id}")
        
        # Use structured outputs for JSON response
        if wants_multi_screen:
            request_params["text"] = {"format": {"type": "json_schema", "json_schema": {"schema": MultiScreenPrototype.model_json_schema(), "strict": True}}}
        else:
            request_params["text"] = {"format": {"type": "json_schema", "json_schema": {"schema": SinglePrototype.model_json_schema(), "strict": True}}}
        
        response = client.responses.create(**request_params)
        
        # Extract the prototype data and response ID
        result = json.loads(response.output_text)
        response_id = response.id
        
        print(f"Successfully generated structured prototype with Responses API")
        return result, response_id
        
    except Exception as e:
        print(f"GPT-5 Responses API generation failed: {e}")
        # Fallback to the old structured outputs method
        try:
            result = await generate_prototype_fallback(user_input, history, current_prototype)
            return result, None  # No response ID from fallback
        except Exception as fallback_e:
            print(f"Fallback generation also failed: {fallback_e}")
            error_result = {
                "component": "div",
                "props": {"className": "error", "style": {"color": "red"}},
                "text": f"Error: Could not generate prototype with GPT-5. Try rephrasing your request."
            }
            return error_result, None

async def generate_prototype_fallback(user_input, history, current_prototype):
    """Fallback method using traditional JSON parsing"""
    context = "\n".join([f"User said: {h}" for h in history[-5:]])
    
    prompt = f"""You are a UI prototype generator. Return valid JSON only.

Current prototype: {json.dumps(current_prototype, indent=2) if current_prototype else "Empty"}
History: {context}
New request: {user_input}

Return a JSON structure with component, props (optional), children (optional), and text (optional) fields."""

    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are a UI generator. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        # Clean up response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
        
    except Exception as e:
        print(f"Fallback generation failed: {e}")
        return {
            "component": "div",
            "props": {"className": "error", "style": {"color": "red"}},
            "text": f"Error: Could not generate prototype. Try rephrasing your request."
        }

async def generate_prd(prompt: str):
    """Generate PRD from prompt using GPT-5 Responses API"""
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.responses.create(
            model="gpt-5",
            instructions="You are a product manager. Generate comprehensive PRDs in markdown format.",
            input=prompt,
            text={"format": {"type": "json_schema", "json_schema": {"schema": DocumentResponse.model_json_schema(), "strict": True}}},
            temperature=0.3
        )
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

async def generate_design_doc(prompt: str):
    """Generate design document from prompt using GPT-5 Responses API"""
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.responses.create(
            model="gpt-5",
            instructions="You are a UX/UI designer. Generate comprehensive design documentation in markdown format.",
            input=prompt,
            text={"format": {"type": "json_schema", "json_schema": {"schema": DocumentResponse.model_json_schema(), "strict": True}}},
            temperature=0.3
        )
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

@app.get("/")
async def root():
    return {"message": "AI Prototype Builder Backend", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "sessions": len(sessions)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)