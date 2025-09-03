"""
Authentication service for user management
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os

from ..models.user_models import User, UserCreate, UserLogin, TokenData, UserRole
from ..services.json_storage_service import json_storage_service


class AuthService:
    """Authentication and user management service"""
    
    def __init__(self):
        # JWT settings
        self.secret_key = os.getenv("JWT_SECRET", "your-super-secret-key-change-this-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_hours = 24
        
        # Password hashing
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def hash_password(self, password: str) -> str:
        """Hash a password"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def generate_user_id(self, email: str) -> str:
        """Generate a unique user ID"""
        timestamp = str(datetime.now().timestamp())
        data = f"{email}{timestamp}{secrets.token_hex(8)}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def create_access_token(self, user: User) -> Dict[str, Any]:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(hours=self.access_token_expire_hours)
        
        token_data = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.value,
            "exp": expire,
            "iat": datetime.utcnow(),
            "sub": user.email
        }
        
        token = jwt.encode(token_data, self.secret_key, algorithm=self.algorithm)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_hours * 3600,
            "expires_at": expire.isoformat()
        }
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            user_id = payload.get("user_id")
            email = payload.get("email")
            role = payload.get("role")
            exp = payload.get("exp")
            
            if not all([user_id, email, role, exp]):
                return None
            
            # Check if token is expired
            if datetime.utcnow() > datetime.fromtimestamp(exp):
                return None
            
            return TokenData(
                user_id=user_id,
                email=email,
                role=UserRole(role),
                exp=datetime.fromtimestamp(exp)
            )
            
        except JWTError:
            return None
    
    async def register_user(self, user_data: UserCreate) -> User:
        """Register a new user"""
        # Check if user already exists
        existing_user = await json_storage_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create new user
        user_id = self.generate_user_id(user_data.email)
        hashed_password = self.hash_password(user_data.password)
        
        user = User(
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role=UserRole.USER,
            is_active=True,
            is_verified=False
        )
        
        # Save to JSON storage
        success = await json_storage_service.create_user(user)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        return user
    
    async def authenticate_user(self, login_data: UserLogin) -> Optional[User]:
        """Authenticate user credentials"""
        user = await json_storage_service.get_user_by_email(login_data.email)
        
        if not user:
            return None
        
        if not hasattr(user, 'hashed_password'):
            return None
            
        if not self.verify_password(login_data.password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login_at = datetime.now()
        await json_storage_service.update_user(user)
        
        return user
    
    async def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from token"""
        token_data = self.verify_token(token)
        if not token_data:
            return None
        
        user = await json_storage_service.get_user(token_data.user_id)
        if not user or not user.is_active:
            return None
        
        return user
    
    async def refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Refresh an access token"""
        token_data = self.verify_token(token)
        if not token_data:
            return None
        
        user = await json_storage_service.get_user(token_data.user_id)
        if not user:
            return None
        
        return self.create_access_token(user)
    
    def require_role(self, required_role: UserRole):
        """Decorator to require specific user role"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # This would be used with FastAPI dependency injection
                # Implementation depends on how it's integrated
                return await func(*args, **kwargs)
            return wrapper
        return decorator


# Global auth service instance
auth_service = AuthService()