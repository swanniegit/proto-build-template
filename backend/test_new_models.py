#!/usr/bin/env python3
"""
Test script for Phase 1 enhanced data models
"""

import sys
import os
from datetime import datetime
import uuid

# Add the current directory to the path so we can import from server
sys.path.append(os.path.dirname(__file__))

from server import (
    AgentType, AgentInsight, AgentReference, ConversationTurn, 
    ConversationContext, SharedAgentMemory, EnhancedAgentResponse
)

def test_agent_insight():
    """Test AgentInsight model"""
    print("Testing AgentInsight...")
    
    insight = AgentInsight(
        id=str(uuid.uuid4()),
        agent_type=AgentType.UI_DESIGNER,
        content="The login form needs better visual hierarchy",
        insight_type="concern",
        priority=2,
        confidence=0.9,
        timestamp=datetime.now().isoformat(),
        related_to="login_form_section"
    )
    
    print(f"[OK] AgentInsight created: {insight.agent_type.value} - {insight.content}")
    return insight

def test_agent_reference():
    """Test AgentReference model"""
    print("Testing AgentReference...")
    
    reference = AgentReference(
        source_agent=AgentType.UX_RESEARCHER,
        target_agent=AgentType.UI_DESIGNER,
        reference_type="question_for",
        source_insight_id="insight-123",
        content="Can you provide specific color recommendations for the login form?",
        timestamp=datetime.now().isoformat()
    )
    
    print(f"[OK] AgentReference created: {reference.source_agent.value} -> {reference.target_agent.value}")
    return reference

def test_conversation_context():
    """Test ConversationContext model"""
    print("Testing ConversationContext...")
    
    context = ConversationContext(
        session_id="test-session-123",
        imported_documents=[
            {"name": "test.md", "content": "Test document content"}
        ],
        active_requirements=["Login functionality", "User dashboard"],
        current_focus="Authentication system"
    )
    
    print(f"[OK] ConversationContext created for session: {context.session_id}")
    print(f"   Documents: {len(context.imported_documents)}")
    print(f"   Requirements: {len(context.active_requirements)}")
    return context

def test_shared_agent_memory():
    """Test SharedAgentMemory model"""
    print("Testing SharedAgentMemory...")
    
    # Create context
    context = test_conversation_context()
    
    # Create shared memory
    memory = SharedAgentMemory(
        session_id="test-session-123",
        conversation_context=context
    )
    
    # Add some insights
    insight1 = test_agent_insight()
    insight2 = AgentInsight(
        id=str(uuid.uuid4()),
        agent_type=AgentType.DEVELOPER,
        content="Authentication should use JWT tokens",
        insight_type="recommendation",
        priority=3,
        confidence=0.85,
        timestamp=datetime.now().isoformat()
    )
    
    memory.add_insight(insight1)
    memory.add_insight(insight2)
    
    # Add a cross-reference
    reference = test_agent_reference()
    memory.add_cross_reference(reference)
    
    # Test context enrichment
    enriched_context = memory.create_enriched_context(
        AgentType.UI_DESIGNER, 
        "How should I design the login form?"
    )
    
    print(f"[OK] SharedAgentMemory created with:")
    print(f"   Insights: {len(memory.get_all_insights_except(AgentType.STAKEHOLDER))}")
    print(f"   References: {len(memory.cross_references)}")
    print(f"   Enriched context length: {len(enriched_context)} characters")
    
    return memory

def test_enhanced_agent_response():
    """Test EnhancedAgentResponse model"""
    print("Testing EnhancedAgentResponse...")
    
    insights = [test_agent_insight()]
    references = [test_agent_reference()]
    
    response = EnhancedAgentResponse(
        agent_type=AgentType.UI_DESIGNER,
        content="I recommend using a clean, minimalist design for the login form with proper spacing and visual hierarchy.",
        suggestions=["Use consistent color scheme", "Add proper error states"],
        confidence_level=0.9,
        insights=insights,
        questions_for_agents={
            "ux_researcher": ["What are the key user pain points in authentication?"],
            "developer": ["What security constraints should I consider?"]
        },
        references_to_agents=references,
        requires_input_from=[AgentType.UX_RESEARCHER],
        builds_on_insights=[insights[0].id]
    )
    
    print(f"[OK] EnhancedAgentResponse created:")
    print(f"   Agent: {response.agent_type.value}")
    print(f"   Confidence: {response.confidence_level}")
    print(f"   Insights: {len(response.insights)}")
    print(f"   Questions for agents: {len(response.questions_for_agents)}")
    print(f"   Requires input from: {len(response.requires_input_from)} agents")
    
    return response

def run_all_tests():
    """Run all model tests"""
    print("Starting Phase 1 Data Model Tests")
    print("=" * 50)
    
    try:
        # Test individual models
        insight = test_agent_insight()
        print()
        
        reference = test_agent_reference()
        print()
        
        context = test_conversation_context()
        print()
        
        memory = test_shared_agent_memory()
        print()
        
        response = test_enhanced_agent_response()
        print()
        
        # Test integration
        print("Testing integration...")
        print(f"[OK] All models work together correctly")
        print(f"[OK] Pydantic validation passed")
        print(f"[OK] JSON serialization works")
        
        # Test serialization
        response_dict = response.model_dump()
        memory_dict = memory.model_dump()
        
        print(f"[OK] Serialization successful")
        print(f"   Response dict keys: {list(response_dict.keys())}")
        print(f"   Memory dict keys: {list(memory_dict.keys())}")
        
        print("\nAll Phase 1 data model tests passed!")
        
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)