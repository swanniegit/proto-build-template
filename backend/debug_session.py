#!/usr/bin/env python3
"""Debug script to check session state and context flow"""

import sys
import os
sys.path.append('.')

from app.state import sessions
from app.models.agent_models import AgentType

def debug_session_state():
    print("=== SESSION DEBUG ===")
    print(f"Total sessions: {len(sessions)}")
    
    if sessions:
        for session_id, session_data in sessions.items():
            print(f"\nSession ID: {session_id}")
            print(f"History: {session_data.get('history', [])}")
            print(f"Current request: {session_data.get('current_request', 'None')}")
            print(f"Memory exists: {'memory' in session_data}")
            print(f"Agents: {list(session_data.get('agents', {}).keys())}")
            
            # Check if current request is stored
            if session_data.get('current_request'):
                print(f"✅ Current request found: '{session_data['current_request']}'")
            else:
                print("❌ No current request stored")
    else:
        print("No sessions found")

if __name__ == "__main__":
    debug_session_state()