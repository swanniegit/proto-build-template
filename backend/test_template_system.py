#!/usr/bin/env python3
"""
Test script for the template-based multi-agent system.
"""

import asyncio
import json
import sys
import os

# Add the backend app to Python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.services.agent_template_service import agent_template_service
from app.services.template_agent_executor import template_agent_executor
from app.models.agent_templates import CreateAgentTemplateRequest, AgentTemplateType

async def test_template_system():
    """Test the complete template system"""
    print("🧪 Testing Template-Based Multi-Agent System")
    print("=" * 50)
    
    # Test 1: Get all default templates
    print("\n1. Loading default templates...")
    collection = agent_template_service.get_all_templates()
    print(f"   ✅ Found {len(collection.templates)} templates")
    print(f"   ✅ Active templates: {len(collection.active_templates)}")
    
    # Print template names and types
    for template in collection.templates:
        status = "🟢" if template.is_active else "🔴"
        custom = "🎯" if template.is_custom else "📋"
        print(f"   {status} {custom} {template.name} ({template.type}) - {template.icon}")
    
    # Test 2: Execute a single agent
    print("\n2. Testing single agent execution...")
    ui_designer_template = agent_template_service.get_template_by_type(AgentTemplateType.UI_DESIGNER)
    if ui_designer_template:
        try:
            result = await template_agent_executor.execute_agent_template(
                ui_designer_template.id,
                "Create a modern login form with email and password fields",
                {
                    "conversation_history": ["User wants to create a login system"],
                    "session_preferences": "Prefers clean, minimal design"
                }
            )
            print(f"   ✅ {result.agent_name} executed in {result.execution_time:.2f}s")
            print(f"   ✅ Confidence: {result.confidence_level:.0%}")
            print(f"   ✅ Suggestions: {len(result.suggestions)}")
            print(f"   📝 Content preview: {result.content[:100]}...")
        except Exception as e:
            print(f"   ❌ Error executing UI Designer: {e}")
    
    # Test 3: Execute multiple agents
    print("\n3. Testing multiple agent execution...")
    core_templates = [t.id for t in collection.templates if not t.is_custom][:3]  # First 3 core templates
    
    try:
        results = await template_agent_executor.execute_multiple_templates(
            core_templates,
            "Create a dashboard for project management with task tracking",
            {"session_preferences": "User prefers data visualization"}
        )
        
        print(f"   ✅ Executed {len(results)} agents in parallel")
        for result in results:
            print(f"   - {result.agent_name}: {result.confidence_level:.0%} confidence, {result.execution_time:.2f}s")
            
    except Exception as e:
        print(f"   ❌ Error executing multiple agents: {e}")
    
    # Test 4: Test special agents (Rerun, Questions)
    print("\n4. Testing special agent types...")
    
    # Test Questions agent
    questions_template = agent_template_service.get_template_by_type(AgentTemplateType.QUESTIONS)
    if questions_template:
        try:
            result = await template_agent_executor.execute_agent_template(
                questions_template.id,
                "Build an e-commerce mobile app",
                {}
            )
            print(f"   ✅ Questions Agent: Generated {len(result.questions)} questions")
            for i, question in enumerate(result.questions[:3], 1):
                print(f"      {i}. {question}")
        except Exception as e:
            print(f"   ❌ Error with Questions agent: {e}")
    
    # Test Rerun agent
    rerun_template = agent_template_service.get_template_by_type(AgentTemplateType.RERUN)
    if rerun_template:
        try:
            result = await template_agent_executor.execute_agent_template(
                rerun_template.id,
                "Design a social media application",
                {}
            )
            print(f"   ✅ Rerun Agent: Generated {len(result.rerun_results)} variations")
            print(f"   📊 Total execution time: {result.execution_time:.2f}s")
        except Exception as e:
            print(f"   ❌ Error with Rerun agent: {e}")
    
    # Test 5: Create custom template
    print("\n5. Testing custom template creation...")
    try:
        custom_request = CreateAgentTemplateRequest(
            name="Security Analyst",
            type=AgentTemplateType.DEVELOPER,  # Reuse existing type
            description="Analyzes security implications and vulnerabilities",
            prompt="You are a security analyst. Focus on identifying potential security risks, vulnerabilities, and suggesting security best practices.",
            color="#FF6B35",
            icon="🔒"
        )
        
        custom_template = agent_template_service.create_template(custom_request)
        print(f"   ✅ Created custom template: {custom_template.name}")
        print(f"   📋 Template ID: {custom_template.id}")
        print(f"   🎯 Is custom: {custom_template.is_custom}")
        
        # Test the custom template
        result = await template_agent_executor.execute_agent_template(
            custom_template.id,
            "Review this authentication system for security issues",
            {}
        )
        print(f"   ✅ Custom template executed successfully")
        print(f"   🔒 Security analysis preview: {result.content[:100]}...")
        
    except Exception as e:
        print(f"   ❌ Error creating/testing custom template: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Template system test completed!")

if __name__ == "__main__":
    # Set up environment for testing
    os.environ.setdefault("OPENAI_API_KEY", "test-key-here")
    
    try:
        asyncio.run(test_template_system())
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)