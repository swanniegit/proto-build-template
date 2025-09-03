import os
from typing import Dict, List, Optional, AsyncGenerator
from .base_provider import BaseLLMProvider, LLMProvider, LLMModel, LLMMessage, LLMResponse
from .openai_provider import OpenAIProvider
from .deepseek_provider import DeepSeekProvider
from .kimi_provider import KimiProvider

class LLMManager:
    """Central manager for all LLM providers"""
    
    def __init__(self):
        self.providers: Dict[LLMProvider, BaseLLMProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize all available LLM providers based on environment variables"""
        
        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and openai_key != "your_openai_api_key_here":
            try:
                self.providers[LLMProvider.OPENAI] = OpenAIProvider(openai_key)
                print(f"[OK] OpenAI provider initialized")
            except Exception as e:
                print(f"[ERROR] Failed to initialize OpenAI: {e}")
        
        # DeepSeek
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key and deepseek_key != "your_deepseek_api_key_here":
            try:
                self.providers[LLMProvider.DEEPSEEK] = DeepSeekProvider(deepseek_key)
                print(f"[OK] DeepSeek provider initialized")
            except Exception as e:
                print(f"[ERROR] Failed to initialize DeepSeek: {e}")
        
        # Kimi (Moonshot)
        kimi_key = os.getenv("KIMI_API_KEY") or os.getenv("MOONSHOT_API_KEY")
        if kimi_key and kimi_key != "your_kimi_api_key_here":
            try:
                self.providers[LLMProvider.KIMI] = KimiProvider(kimi_key)
                print(f"[OK] Kimi provider initialized")
            except Exception as e:
                print(f"[ERROR] Failed to initialize Kimi: {e}")
        
        if not self.providers:
            print("[WARNING] No LLM providers initialized. Please check your API keys in .env")
    
    def get_available_providers(self) -> List[LLMProvider]:
        """Get list of available providers"""
        return list(self.providers.keys())
    
    def get_available_models(self, provider: Optional[LLMProvider] = None) -> List[LLMModel]:
        """Get all available models, optionally filtered by provider"""
        models = []
        
        if provider:
            if provider in self.providers:
                models.extend(self.providers[provider].get_available_models())
        else:
            for provider_instance in self.providers.values():
                models.extend(provider_instance.get_available_models())
        
        return models
    
    def get_provider_for_model(self, model_id: str) -> Optional[LLMProvider]:
        """Find which provider supports a given model"""
        for provider_type, provider in self.providers.items():
            if provider.validate_model(model_id):
                return provider_type
        return None
    
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str,
        provider: Optional[LLMProvider] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate a response using specified model and provider"""
        
        # Auto-detect provider if not specified
        if not provider:
            provider = self.get_provider_for_model(model)
            if not provider:
                raise ValueError(f"No provider found for model: {model}")
        
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} is not available")
        
        provider_instance = self.providers[provider]
        
        if not provider_instance.validate_model(model):
            available_models = [m.id for m in provider_instance.get_available_models()]
            raise ValueError(f"Model {model} not available for {provider}. Available: {available_models}")
        
        return await provider_instance.generate(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    
    async def stream_generate(
        self,
        messages: List[LLMMessage],
        model: str,
        provider: Optional[LLMProvider] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response using specified model and provider"""
        
        # Auto-detect provider if not specified
        if not provider:
            provider = self.get_provider_for_model(model)
            if not provider:
                raise ValueError(f"No provider found for model: {model}")
        
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} is not available")
        
        provider_instance = self.providers[provider]
        
        if not provider_instance.validate_model(model):
            available_models = [m.id for m in provider_instance.get_available_models()]
            raise ValueError(f"Model {model} not available for {provider}. Available: {available_models}")
        
        async for chunk in provider_instance.stream_generate(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        ):
            yield chunk
    
    def get_provider_status(self) -> Dict[str, Dict]:
        """Get status information for all providers"""
        status = {}
        
        for provider_type in LLMProvider:
            if provider_type in self.providers:
                models = self.providers[provider_type].get_available_models()
                status[provider_type.value] = {
                    "available": True,
                    "model_count": len(models),
                    "models": [{"id": m.id, "name": m.name, "context_length": m.context_length} for m in models]
                }
            else:
                status[provider_type.value] = {
                    "available": False,
                    "reason": "API key not configured"
                }
        
        return status

# Global LLM manager instance
llm_manager = LLMManager()