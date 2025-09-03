from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum

class AgentType(str, Enum):
    UI_DESIGNER = "ui_designer"
    UX_RESEARCHER = "ux_researcher"
    DEVELOPER = "developer"
    PRODUCT_MANAGER = "product_manager"
    STAKEHOLDER = "stakeholder"
    # Stories & QA Agent Types
    EPIC_GENERATOR = "epic_generator"
    STORY_GENERATOR = "story_generator"
    QA_PLANNER = "qa_planner"
    REVIEW_AGENT = "review_agent"
    # Development Planning Agent
    DEVELOPMENT_PLANNER = "development_planner"
    # Micro-Architecture Agent
    LEGO_BUILDER = "lego_builder"

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


class ConversationContext(BaseModel):
    session_id: str
    turns: List[Dict[str, Any]] = []
    imported_documents: List[Dict[str, Any]] = []
    conversation_metadata: Dict[str, Any] = {}


class SharedAgentMemory(BaseModel):
    session_id: str
    conversation_context: ConversationContext
    cross_agent_insights: List[Dict[str, Any]] = []
    synthesis_results: List[Dict[str, Any]] = []