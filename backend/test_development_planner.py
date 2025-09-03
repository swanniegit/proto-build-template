#!/usr/bin/env python3

import asyncio
import os
import sys

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.base import StoriesAndQAAgent
from app.models.agent_models import AgentType

async def test_development_planner():
    """Test the Development Planner agent"""
    
    print("Testing Development Planner Agent...")
    
    # Create the agent
    agent = StoriesAndQAAgent(AgentType.DEVELOPMENT_PLANNER)
    
    # Test input - a simple project request
    user_input = "Create a comprehensive development plan for a mobile banking application with user registration, account management, money transfers, and transaction history features."
    
    context = "This is a greenfield mobile banking project for a South African fintech startup."
    prd_content = """
    Product: Mobile Banking Application
    Target Users: South African retail banking customers
    Core Features: User registration, account management, money transfers, transaction history
    Platform: iOS and Android mobile app
    Timeline: 6 months development
    """
    
    try:
        # Process the request
        result = await agent.process_request(user_input, context, prd_content)
        
        print("Development Planner agent executed successfully!")
        print("\nAgent Response:")
        print("=" * 60)
        print(f"Agent Type: {result['agent_type']}")
        print(f"\nContent Preview (first 500 chars):")
        print(result['content'][:500] + "..." if len(result['content']) > 500 else result['content'])
        
        print(f"\nSuggestions: {len(result['suggestions'])}")
        for i, suggestion in enumerate(result['suggestions'], 1):
            print(f"  {i}. {suggestion}")
        
        print(f"\nDeliverables: {len(result['deliverables'])}")
        
        # Check if we have development plan structure
        if 'epics' in result:
            print(f"\nEpics Generated: {len(result['epics'])}")
        if 'stories' in result:
            print(f"Stories Generated: {len(result['stories'])}")
        if 'tasks' in result:
            print(f"Tasks Generated: {len(result['tasks'])}")
        
        print("\nDevelopment Planner test completed successfully!")
        return True
        
    except Exception as e:
        print(f"X Development Planner test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_development_planner())
    sys.exit(0 if success else 1)