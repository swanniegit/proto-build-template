#!/usr/bin/env python3
"""
Test script for multi-agent system functionality
"""

from enum import Enum
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

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

def test_multi_agent_models():
    """Test that Pydantic models work correctly"""
    
    # Test AgentResponse creation
    response = AgentResponse(
        agent_type=AgentType.UI_DESIGNER,
        content="This is a test UI design analysis",
        suggestions=["Use more consistent spacing", "Consider a different color scheme"],
        critique="The current layout lacks visual hierarchy",
        handoff_to=AgentType.UX_RESEARCHER
    )
    
    print("AgentResponse model created successfully")
    print(f"  Agent: {response.agent_type}")
    print(f"  Content: {response.content}")
    print(f"  Suggestions: {len(response.suggestions)}")
    print(f"  Handoff to: {response.handoff_to}")
    
    # Test model serialization
    response_dict = response.model_dump()
    print("Model serialization works")
    print(f"  Serialized keys: {list(response_dict.keys())}")
    
    return True

if __name__ == "__main__":
    print("Testing Multi-Agent System Components...")
    print("=" * 50)
    
    test_multi_agent_models()
    
    print("\nAll multi-agent component tests passed!")