"""
User management API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional

from ..models.user_models import (
    UserCreate, UserLogin, UserUpdate, UserResponse, LoginResponse,
    ChatSession, CustomAgent, CustomAgentCreate, CustomAgentUpdate
)
from ..services.auth_service import auth_service
from ..services.json_storage_service import json_storage_service

router = APIRouter(prefix="/api/users", tags=["Users"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    user = await auth_service.get_current_user(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return user


@router.post("/register", response_model=LoginResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Create user
        user = await auth_service.register_user(user_data)
        
        # Generate access token
        token_data = auth_service.create_access_token(user)
        
        # Return response without sensitive data
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            preferences=user.preferences,
            stats=user.stats,
            created_at=user.created_at,
            last_login_at=user.last_login_at
        )
        
        return LoginResponse(
            access_token=token_data["access_token"],
            expires_in=token_data["expires_in"],
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    """User login"""
    user = await auth_service.authenticate_user(login_data)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Generate access token
    token_data = auth_service.create_access_token(user)
    
    # Return response without sensitive data
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        preferences=user.preferences,
        stats=user.stats,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )
    
    return LoginResponse(
        access_token=token_data["access_token"],
        expires_in=token_data["expires_in"],
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        preferences=current_user.preferences,
        stats=current_user.stats,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at
    )


@router.put("/me", response_model=UserResponse)
async def update_me(user_update: UserUpdate, current_user = Depends(get_current_user)):
    """Update current user profile"""
    try:
        # Update user fields
        if user_update.username:
            current_user.username = user_update.username
        if user_update.full_name is not None:
            current_user.full_name = user_update.full_name
        if user_update.avatar_url is not None:
            current_user.avatar_url = user_update.avatar_url
        if user_update.preferences:
            current_user.preferences = user_update.preferences
        
        # Save to JSON storage
        success = await json_storage_service.update_user(current_user)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            avatar_url=current_user.avatar_url,
            role=current_user.role,
            is_active=current_user.is_active,
            is_verified=current_user.is_verified,
            preferences=current_user.preferences,
            stats=current_user.stats,
            created_at=current_user.created_at,
            last_login_at=current_user.last_login_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.get("/sessions", response_model=List[ChatSession])
async def get_my_sessions(
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    """Get user's chat sessions"""
    try:
        sessions = await json_storage_service.get_user_sessions(current_user.id, limit)
        return sessions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sessions: {str(e)}"
        )


@router.get("/agents", response_model=List[CustomAgent])
async def get_my_agents(current_user = Depends(get_current_user)):
    """Get user's custom agents"""
    try:
        agents = await json_storage_service.get_user_agents(current_user.id)
        return agents
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agents: {str(e)}"
        )


@router.post("/agents", response_model=CustomAgent)
async def create_agent(
    agent_data: CustomAgentCreate,
    current_user = Depends(get_current_user)
):
    """Create a new custom agent"""
    try:
        import uuid
        from datetime import datetime
        
        agent = CustomAgent(
            id=f"custom_{uuid.uuid4().hex[:12]}",
            user_id=current_user.id,
            name=agent_data.name,
            description=agent_data.description,
            prompt=agent_data.prompt,
            color=agent_data.color,
            icon=agent_data.icon,
            is_public=agent_data.is_public,
            is_active=True,
            usage_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        success = await json_storage_service.create_custom_agent(agent)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create agent"
            )
        
        return agent
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent: {str(e)}"
        )


@router.post("/refresh-token")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Refresh access token"""
    token_data = await auth_service.refresh_token(credentials.credentials)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return token_data