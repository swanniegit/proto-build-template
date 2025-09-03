"""
Redis service for user data, sessions, and agent persistence
"""

import json
import redis
import asyncio
from typing import Optional, Dict, List, Any, Union
from datetime import datetime, timedelta
import os
from ..models.user_models import User, ChatSession, ChatMessage, CustomAgent


class RedisService:
    """Redis service for data persistence"""
    
    def __init__(self):
        # Redis connection settings
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", "6379"))
        self.redis_password = os.getenv("REDIS_PASSWORD", None)
        self.redis_db = int(os.getenv("REDIS_DB", "0"))
        
        # Initialize Redis connection
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_password,
                db=self.redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            self.redis_client.ping()
            print(f"[OK] Redis connected: {self.redis_host}:{self.redis_port}")
            
        except Exception as e:
            print(f"[ERROR] Redis connection failed: {e}")
            print("[INFO] Falling back to in-memory storage")
            self.redis_client = None
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    # User Management
    async def create_user(self, user: User) -> bool:
        """Create a new user"""
        try:
            if not self.is_connected():
                return False
            
            user_key = f"user:{user.id}"
            user_data = user.dict()
            user_data['created_at'] = user_data['created_at'].isoformat()
            user_data['updated_at'] = user_data['updated_at'].isoformat()
            if user_data.get('last_login_at'):
                user_data['last_login_at'] = user_data['last_login_at'].isoformat()
            
            self.redis_client.hset(user_key, mapping=user_data)
            
            # Add to user index
            self.redis_client.sadd("users:all", user.id)
            self.redis_client.hset("users:by_email", user.email, user.id)
            self.redis_client.hset("users:by_username", user.username, user.id)
            
            return True
        except Exception as e:
            print(f"[ERROR] Failed to create user: {e}")
            return False
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            if not self.is_connected():
                return None
            
            user_key = f"user:{user_id}"
            user_data = self.redis_client.hgetall(user_key)
            
            if not user_data:
                return None
            
            # Parse datetime fields
            if user_data.get('created_at'):
                user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
            if user_data.get('updated_at'):
                user_data['updated_at'] = datetime.fromisoformat(user_data['updated_at'])
            if user_data.get('last_login_at'):
                user_data['last_login_at'] = datetime.fromisoformat(user_data['last_login_at'])
            
            # Parse JSON fields
            if user_data.get('preferences'):
                user_data['preferences'] = json.loads(user_data['preferences'])
            if user_data.get('stats'):
                user_data['stats'] = json.loads(user_data['stats'])
            
            return User(**user_data)
        except Exception as e:
            print(f"[ERROR] Failed to get user: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            if not self.is_connected():
                return None
            
            user_id = self.redis_client.hget("users:by_email", email)
            if user_id:
                return await self.get_user(user_id)
            return None
        except Exception as e:
            print(f"[ERROR] Failed to get user by email: {e}")
            return None
    
    async def update_user(self, user: User) -> bool:
        """Update user data"""
        try:
            if not self.is_connected():
                return False
            
            user.updated_at = datetime.now()
            return await self.create_user(user)  # Redis HSET updates existing keys
        except Exception as e:
            print(f"[ERROR] Failed to update user: {e}")
            return False
    
    # Session Management
    async def create_session(self, session: ChatSession) -> bool:
        """Create a new chat session"""
        try:
            if not self.is_connected():
                return False
            
            session_key = f"session:{session.id}"
            session_data = session.dict()
            session_data['created_at'] = session_data['created_at'].isoformat()
            session_data['updated_at'] = session_data['updated_at'].isoformat()
            
            # Convert complex fields to JSON
            session_data['selected_agents'] = json.dumps(session_data['selected_agents'])
            session_data['llm_settings'] = json.dumps(session_data['llm_settings'])
            session_data['agent_results'] = json.dumps(session_data['agent_results'])
            session_data['synthesis_results'] = json.dumps(session_data['synthesis_results'])
            
            self.redis_client.hset(session_key, mapping=session_data)
            
            # Add to user's session list
            self.redis_client.sadd(f"user_sessions:{session.user_id}", session.id)
            
            return True
        except Exception as e:
            print(f"[ERROR] Failed to create session: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get session by ID"""
        try:
            if not self.is_connected():
                return None
            
            session_key = f"session:{session_id}"
            session_data = self.redis_client.hgetall(session_key)
            
            if not session_data:
                return None
            
            # Parse datetime fields
            session_data['created_at'] = datetime.fromisoformat(session_data['created_at'])
            session_data['updated_at'] = datetime.fromisoformat(session_data['updated_at'])
            
            # Parse JSON fields
            session_data['selected_agents'] = json.loads(session_data['selected_agents'])
            session_data['llm_settings'] = json.loads(session_data['llm_settings'])
            session_data['agent_results'] = json.loads(session_data['agent_results'])
            session_data['synthesis_results'] = json.loads(session_data['synthesis_results'])
            
            return ChatSession(**session_data)
        except Exception as e:
            print(f"[ERROR] Failed to get session: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[ChatSession]:
        """Get user's recent sessions"""
        try:
            if not self.is_connected():
                return []
            
            session_ids = self.redis_client.smembers(f"user_sessions:{user_id}")
            sessions = []
            
            for session_id in list(session_ids)[:limit]:
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
            if not self.is_connected():
                return False
            
            message_key = f"message:{message.id}"
            message_data = message.dict()
            message_data['created_at'] = message_data['created_at'].isoformat()
            message_data['metadata'] = json.dumps(message_data['metadata'])
            
            # Store message
            self.redis_client.hset(message_key, mapping=message_data)
            
            # Add to session's message list (ordered by timestamp)
            session_messages_key = f"session_messages:{message.session_id}"
            self.redis_client.zadd(session_messages_key, {message.id: message.created_at.timestamp()})
            
            return True
        except Exception as e:
            print(f"[ERROR] Failed to add message: {e}")
            return False
    
    async def get_session_messages(self, session_id: str, limit: int = 100) -> List[ChatMessage]:
        """Get messages for a session"""
        try:
            if not self.is_connected():
                return []
            
            session_messages_key = f"session_messages:{session_id}"
            message_ids = self.redis_client.zrange(session_messages_key, 0, limit-1)
            
            messages = []
            for message_id in message_ids:
                message_key = f"message:{message_id}"
                message_data = self.redis_client.hgetall(message_key)
                
                if message_data:
                    message_data['created_at'] = datetime.fromisoformat(message_data['created_at'])
                    message_data['metadata'] = json.loads(message_data['metadata'])
                    messages.append(ChatMessage(**message_data))
            
            return messages
        except Exception as e:
            print(f"[ERROR] Failed to get session messages: {e}")
            return []
    
    # Custom Agents
    async def create_custom_agent(self, agent: CustomAgent) -> bool:
        """Create a custom agent"""
        try:
            if not self.is_connected():
                return False
            
            agent_key = f"agent:{agent.id}"
            agent_data = agent.dict()
            agent_data['created_at'] = agent_data['created_at'].isoformat()
            agent_data['updated_at'] = agent_data['updated_at'].isoformat()
            if agent_data.get('last_used'):
                agent_data['last_used'] = agent_data['last_used'].isoformat()
            
            self.redis_client.hset(agent_key, mapping=agent_data)
            
            # Add to user's agents list
            self.redis_client.sadd(f"user_agents:{agent.user_id}", agent.id)
            
            # Add to public agents if public
            if agent.is_public:
                self.redis_client.sadd("public_agents", agent.id)
            
            return True
        except Exception as e:
            print(f"[ERROR] Failed to create custom agent: {e}")
            return False
    
    async def get_user_agents(self, user_id: str) -> List[CustomAgent]:
        """Get user's custom agents"""
        try:
            if not self.is_connected():
                return []
            
            agent_ids = self.redis_client.smembers(f"user_agents:{user_id}")
            agents = []
            
            for agent_id in agent_ids:
                agent_key = f"agent:{agent_id}"
                agent_data = self.redis_client.hgetall(agent_key)
                
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
            if not self.is_connected():
                return {}
            
            stats = {
                "total_users": self.redis_client.scard("users:all"),
                "total_sessions": len(self.redis_client.keys("session:*")),
                "total_messages": len(self.redis_client.keys("message:*")),
                "total_custom_agents": len(self.redis_client.keys("agent:*")),
                "public_agents": self.redis_client.scard("public_agents"),
                "redis_info": self.redis_client.info("memory")
            }
            
            return stats
        except Exception as e:
            print(f"[ERROR] Failed to get system stats: {e}")
            return {}


# Global Redis service instance
redis_service = RedisService()