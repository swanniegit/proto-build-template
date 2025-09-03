from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator, List, Optional
from enum import Enum
from pydantic import BaseModel

class LLMProvider(str, Enum):
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    KIMI = "kimi"
    
class LLMModel(BaseModel):
    id: str
    name: str
    provider: LLMProvider
    context_length: int
    supports_streaming: bool = True
    cost_per_token: float = 0.0
    description: str = ""

class LLMMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str

class LLMResponse(BaseModel):
    content: str
    model_used: str
    provider: LLMProvider
    tokens_used: Optional[int] = None
    cost: Optional[float] = None
    response_time: Optional[float] = None

class BaseLLMProvider(ABC):
    """Abstract base class for all LLM providers"""
    
    def __init__(self, api_key: str, **kwargs):
        self.api_key = api_key
        self.config = kwargs
    
    @abstractmethod
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate a single response"""
        pass
    
    @abstractmethod
    async def stream_generate(
        self,
        messages: List[LLMMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response"""
        pass
    
    @abstractmethod
    def get_available_models(self) -> List[LLMModel]:
        """Get list of available models for this provider"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> LLMProvider:
        """Get the provider identifier"""
        pass
    
    def validate_model(self, model: str) -> bool:
        """Check if model is available for this provider"""
        available_models = [m.id for m in self.get_available_models()]
        return model in available_models