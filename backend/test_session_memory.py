#!/usr/bin/env python3
"""
Test script to verify session memory functionality.
"""

import asyncio
import json
from app.agents.memory import SessionMemory
from app.websocket.handlers import process_single_agent
from app.models.agent_models import AgentType
from app.agents.base import DesignAgent

async def test_session_memory():
    """Test session memory functionality"""
    
    print("Testing Session Memory Functionality...")
    
    # Create a mock session
    memory = SessionMemory()
    agent = DesignAgent(AgentType.DEVELOPER)
    
    mock_session = {
        "history": ["Create a login form", "Make it blue", "Add validation"],
        "memory": memory,
        "current_prototype": {
            "component": "form",
            "props": {"className": "login-form"},
            "children": [
                {"component": "input", "props": {"type": "email", "placeholder": "Email"}},
                {"component": "input", "props": {"type": "password", "placeholder": "Password"}},
                {"component": "button", "text": "Login"}
            ]
        },
        "agents": {AgentType.DEVELOPER: agent}
    }
    
    # Add some learned preferences
    before_prototype = {"component": "button", "props": {"style": {"color": "red"}}}
    after_prototype = {"component": "button", "props": {"style": {"color": "blue"}}}
    memory.learn_from_change(before_prototype, after_prototype, "Make it blue")
    
    # Test context generation
    print("Testing context generation...")
    context_summary = memory.get_context_summary()
    print(f"Context Summary: {context_summary}")
    
    # Test single agent processing
    print("Testing single agent processing...")
    try:
        responses = await process_single_agent(
            "Check if this form is accessible and suggest improvements",
            mock_session,
            AgentType.DEVELOPER
        )
        
        print(f"Agent response received!")
        print(f"Agent: {responses[0].agent_type}")
        print(f"Content preview: {responses[0].content[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"Error in single agent processing: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_session_memory())
    if result:
        print("Session memory test completed successfully!")
    else:
        print("Session memory test failed!")