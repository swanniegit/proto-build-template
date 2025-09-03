"""
User management models for the Neural AI System
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    PREMIUM = "premium"
    ADMIN = "admin"


class UserPreferences(BaseModel):
    """User preferences and settings"""
    # LLM Settings
    default_llm_provider: str = "openai"
    default_llm_model: str = "gpt-4o-mini"
    default_temperature: float = 0.7
    default_max_tokens: int = 1500
    
    # UI Settings
    theme: str = "neural"  # neural, light, dark
    view_mode: str = "detail"  # detail, list, grid
    results_per_page: int = 10
    auto_save_sessions: bool = True
    
    # Agent Settings
    favorite_agents: List[str] = Field(default_factory=list)
    default_agent_selection: List[str] = Field(default_factory=list)
    max_parallel_agents: int = 5
    
    # Notification Settings
    email_notifications: bool = True
    toast_notifications: bool = True
    synthesis_auto_suggest: bool = True


class UserStats(BaseModel):
    """User usage statistics"""
    total_sessions: int = 0
    total_agents_used: int = 0
    total_custom_agents: int = 0
    favorite_agent_types: Dict[str, int] = Field(default_factory=dict)
    last_login: Optional[datetime] = None
    account_created: datetime = Field(default_factory=datetime.now)


class User(BaseModel):
    """Complete user model"""
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    hashed_password: str
    
    # Account Status
    role: UserRole = UserRole.USER
    is_active: bool = True
    is_verified: bool = False
    
    # Settings
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    stats: UserStats = Field(default_factory=UserStats)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login_at: Optional[datetime] = None


class UserCreate(BaseModel):
    """User creation request"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """User update request"""
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[UserPreferences] = None


class UserResponse(BaseModel):
    """User response (without sensitive data)"""
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    preferences: UserPreferences
    stats: UserStats
    created_at: datetime
    last_login_at: Optional[datetime] = None


class TokenData(BaseModel):
    """JWT token data"""
    user_id: str
    email: str
    role: UserRole
    exp: datetime


class LoginResponse(BaseModel):
    """Login response with token and user data"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600  # 1 hour
    user: UserResponse


class ChatSession(BaseModel):
    """Chat session model"""
    id: str
    user_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Session Data
    user_input: str
    selected_agents: List[str] = Field(default_factory=list)
    llm_settings: Dict[str, Any] = Field(default_factory=dict)
    
    # Results
    agent_results: List[Dict[str, Any]] = Field(default_factory=list)
    synthesis_results: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Metadata
    total_execution_time: float = 0.0
    status: str = "active"  # active, completed, archived


class ChatMessage(BaseModel):
    """Individual chat message"""
    id: str
    session_id: str
    user_id: str
    
    # Message Content
    role: str  # user, agent, system
    agent_type: Optional[str] = None
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)


class CustomAgent(BaseModel):
    """User-created custom agent"""
    id: str
    user_id: str
    
    # Agent Definition
    name: str
    description: str
    prompt: str
    
    # Appearance
    color: str = "#007bff"
    icon: str = "🤖"
    
    # Settings
    is_public: bool = False
    is_active: bool = True
    
    # Usage Stats
    usage_count: int = 0
    last_used: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class CustomAgentCreate(BaseModel):
    """Custom agent creation request"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    prompt: str = Field(..., min_length=10, max_length=5000)
    color: str = "#007bff"
    icon: str = "🤖"
    is_public: bool = False


class CustomAgentUpdate(BaseModel):
    """Custom agent update request"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    prompt: Optional[str] = Field(None, min_length=10, max_length=5000)
    color: Optional[str] = None
    icon: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None