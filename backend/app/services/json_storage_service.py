"""
JSON-based storage service for user data, sessions, and agent persistence
"""

import json
import os
import asyncio
from typing import Optional, Dict, List, Any, Union
from datetime import datetime, timedelta
import uuid
from pathlib import Path
from ..models.user_models import User, ChatSession, ChatMessage, CustomAgent


class JSONStorageService:
    """JSON file-based storage service for data persistence"""
    
    def __init__(self):
        # Storage directory - use absolute path from project root
        project_root = Path(__file__).parent.parent.parent.parent  # Go up to project root
        self.storage_dir = project_root / "backend" / "data"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Storage files
        self.users_file = self.storage_dir / "users.json"
        self.sessions_file = self.storage_dir / "sessions.json" 
        self.messages_file = self.storage_dir / "messages.json"
        self.agents_file = self.storage_dir / "custom_agents.json"
        self.indices_file = self.storage_dir / "indices.json"
        
        # Initialize storage files
        self._initialize_storage()
        print("[OK] JSON storage initialized")
    
    def _initialize_storage(self):
        """Initialize storage files if they don't exist"""
        default_data = {
            "users": {},
            "sessions": {},
            "messages": {},
            "custom_agents": {},
            "indices": {
                "users_by_email": {},
                "users_by_username": {},
                "user_sessions": {},
                "user_agents": {},
                "session_messages": {},
                "public_agents": []
            }
        }
        
        files = [
            (self.users_file, {"users": {}}),
            (self.sessions_file, {"sessions": {}}),
            (self.messages_file, {"messages": {}}),
            (self.agents_file, {"custom_agents": {}}),
            (self.indices_file, default_data["indices"])
        ]
        
        for file_path, default_content in files:
            if not file_path.exists():
                self._write_json(file_path, default_content)
    
    def _read_json(self, file_path: Path) -> Dict[str, Any]:
        """Read JSON file safely"""
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"[ERROR] Failed to read {file_path}: {e}")
            return {}
    
    def _write_json(self, file_path: Path, data: Dict[str, Any]) -> bool:
        """Write JSON file safely"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
            return True
        except Exception as e:
            print(f"[ERROR] Failed to write {file_path}: {e}")
            return False
    
    def is_connected(self) -> bool:
        """Check if storage is available (always True for JSON)"""
        return self.storage_dir.exists()
    
    # User Management
    async def create_user(self, user: User) -> bool:
        """Create a new user"""
        try:
            users_data = self._read_json(self.users_file)
            indices_data = self._read_json(self.indices_file)
            
            # Convert user to dict with proper datetime serialization
            user_dict = user.dict()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            user_dict['updated_at'] = user_dict['updated_at'].isoformat()
            if user_dict.get('last_login_at'):
                user_dict['last_login_at'] = user_dict['last_login_at'].isoformat()
            
            # Store user
            users_data["users"][user.id] = user_dict
            
            # Update indices
            indices_data["users_by_email"][user.email] = user.id
            indices_data["users_by_username"][user.username] = user.id
            
            # Save to files
            success1 = self._write_json(self.users_file, users_data)
            success2 = self._write_json(self.indices_file, indices_data)
            
            return success1 and success2
        except Exception as e:
            print(f"[ERROR] Failed to create user: {e}")
            return False
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            users_data = self._read_json(self.users_file)
            user_data = users_data.get("users", {}).get(user_id)
            
            if not user_data:
                return None
            
            # Parse datetime fields
            if user_data.get('created_at'):
                user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
            if user_data.get('updated_at'):
                user_data['updated_at'] = datetime.fromisoformat(user_data['updated_at'])
            if user_data.get('last_login_at'):
                user_data['last_login_at'] = datetime.fromisoformat(user_data['last_login_at'])
            
            return User(**user_data)
        except Exception as e:
            print(f"[ERROR] Failed to get user: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            indices_data = self._read_json(self.indices_file)
            user_id = indices_data.get("users_by_email", {}).get(email)
            
            if user_id:
                return await self.get_user(user_id)
            return None
        except Exception as e:
            print(f"[ERROR] Failed to get user by email: {e}")
            return None
    
    async def update_user(self, user: User) -> bool:
        """Update user data"""
        try:
            user.updated_at = datetime.now()
            return await self.create_user(user)  # Overwrite existing user
        except Exception as e:
            print(f"[ERROR] Failed to update user: {e}")
            return False
    
    # Session Management
    async def create_session(self, session: ChatSession) -> bool:
        """Create a new chat session"""
        try:
            sessions_data = self._read_json(self.sessions_file)
            indices_data = self._read_json(self.indices_file)
            
            # Convert session to dict
            session_dict = session.dict()
            session_dict['created_at'] = session_dict['created_at'].isoformat()
            session_dict['updated_at'] = session_dict['updated_at'].isoformat()
            
            # Store session
            sessions_data["sessions"][session.id] = session_dict
            
            # Update user sessions index
            if session.user_id not in indices_data.get("user_sessions", {}):
                indices_data["user_sessions"][session.user_id] = []
            if session.id not in indices_data["user_sessions"][session.user_id]:
                indices_data["user_sessions"][session.user_id].append(session.id)
            
            # Save to files
            success1 = self._write_json(self.sessions_file, sessions_data)
            success2 = self._write_json(self.indices_file, indices_data)
            
            return success1 and success2
        except Exception as e:
            print(f"[ERROR] Failed to create session: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get session by ID"""
        try:
            sessions_data = self._read_json(self.sessions_file)
            session_data = sessions_data.get("sessions", {}).get(session_id)
            
            if not session_data:
                return None
            
            # Parse datetime fields
            session_data['created_at'] = datetime.fromisoformat(session_data['created_at'])
            session_data['updated_at'] = datetime.fromisoformat(session_data['updated_at'])
            
            return ChatSession(**session_data)
        except Exception as e:
            print(f"[ERROR] Failed to get session: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[ChatSession]:
        """Get user's recent sessions"""
        try:
            indices_data = self._read_json(self.indices_file)
            session_ids = indices_data.get("user_sessions", {}).get(user_id, [])
            
            sessions = []
            for session_id in session_ids[:limit]:
                session = await self.get_session(session_id)
                if session:
                    sessions.append(session)
            
            # Sort by updated_at descending
            sessions.sort(key=lambda x: x.updated_at, reverse=True)
            return sessions[:limit]
        except Exception as e:
            print(f"[ERROR] Failed to get user sessions: {e}")
            return []
    
    # Chat Messages
    async def add_message(self, message: ChatMessage) -> bool:
        """Add a chat message to a session"""
        try:
            messages_data = self._read_json(self.messages_file)
            indices_data = self._read_json(self.indices_file)
            
            # Convert message to dict
            message_dict = message.dict()
            message_dict['created_at'] = message_dict['created_at'].isoformat()
            
            # Store message
            messages_data["messages"][message.id] = message_dict
            
            # Update session messages index
            if message.session_id not in indices_data.get("session_messages", {}):
                indices_data["session_messages"][message.session_id] = []
            if message.id not in indices_data["session_messages"][message.session_id]:
                indices_data["session_messages"][message.session_id].append(message.id)
            
            # Save to files
            success1 = self._write_json(self.messages_file, messages_data)
            success2 = self._write_json(self.indices_file, indices_data)
            
            return success1 and success2
        except Exception as e:
            print(f"[ERROR] Failed to add message: {e}")
            return False
    
    async def get_session_messages(self, session_id: str, limit: int = 100) -> List[ChatMessage]:
        """Get messages for a session"""
        try:
            indices_data = self._read_json(self.indices_file)
            messages_data = self._read_json(self.messages_file)
            
            message_ids = indices_data.get("session_messages", {}).get(session_id, [])
            
            messages = []
            for message_id in message_ids[:limit]:
                message_data = messages_data.get("messages", {}).get(message_id)
                if message_data:
                    message_data['created_at'] = datetime.fromisoformat(message_data['created_at'])
                    messages.append(ChatMessage(**message_data))
            
            return messages
        except Exception as e:
            print(f"[ERROR] Failed to get session messages: {e}")
            return []
    
    # Custom Agents
    async def create_custom_agent(self, agent: CustomAgent) -> bool:
        """Create a custom agent"""
        try:
            agents_data = self._read_json(self.agents_file)
            indices_data = self._read_json(self.indices_file)
            
            # Convert agent to dict
            agent_dict = agent.dict()
            agent_dict['created_at'] = agent_dict['created_at'].isoformat()
            agent_dict['updated_at'] = agent_dict['updated_at'].isoformat()
            if agent_dict.get('last_used'):
                agent_dict['last_used'] = agent_dict['last_used'].isoformat()
            
            # Store agent
            agents_data["custom_agents"][agent.id] = agent_dict
            
            # Update user agents index
            if agent.user_id not in indices_data.get("user_agents", {}):
                indices_data["user_agents"][agent.user_id] = []
            if agent.id not in indices_data["user_agents"][agent.user_id]:
                indices_data["user_agents"][agent.user_id].append(agent.id)
            
            # Update public agents index
            if agent.is_public and agent.id not in indices_data.get("public_agents", []):
                indices_data["public_agents"].append(agent.id)
            
            # Save to files
            success1 = self._write_json(self.agents_file, agents_data)
            success2 = self._write_json(self.indices_file, indices_data)
            
            return success1 and success2
        except Exception as e:
            print(f"[ERROR] Failed to create custom agent: {e}")
            return False
    
    async def get_user_agents(self, user_id: str) -> List[CustomAgent]:
        """Get user's custom agents"""
        try:
            indices_data = self._read_json(self.indices_file)
            agents_data = self._read_json(self.agents_file)
            
            agent_ids = indices_data.get("user_agents", {}).get(user_id, [])
            
            agents = []
            for agent_id in agent_ids:
                agent_data = agents_data.get("custom_agents", {}).get(agent_id)
                if agent_data:
                    # Parse datetime fields
                    agent_data['created_at'] = datetime.fromisoformat(agent_data['created_at'])
                    agent_data['updated_at'] = datetime.fromisoformat(agent_data['updated_at'])
                    if agent_data.get('last_used'):
                        agent_data['last_used'] = datetime.fromisoformat(agent_data['last_used'])
                    
                    agents.append(CustomAgent(**agent_data))
            
            return agents
        except Exception as e:
            print(f"[ERROR] Failed to get user agents: {e}")
            return []
    
    # System Stats
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get system-wide statistics"""
        try:
            users_data = self._read_json(self.users_file)
            sessions_data = self._read_json(self.sessions_file)
            messages_data = self._read_json(self.messages_file)
            agents_data = self._read_json(self.agents_file)
            indices_data = self._read_json(self.indices_file)
            
            stats = {
                "total_users": len(users_data.get("users", {})),
                "total_sessions": len(sessions_data.get("sessions", {})),
                "total_messages": len(messages_data.get("messages", {})),
                "total_custom_agents": len(agents_data.get("custom_agents", {})),
                "public_agents": len(indices_data.get("public_agents", [])),
                "storage_type": "JSON files",
                "storage_location": str(self.storage_dir.absolute())
            }
            
            return stats
        except Exception as e:
            print(f"[ERROR] Failed to get system stats: {e}")
            return {}


# Global JSON storage service instance
json_storage_service = JSONStorageService()