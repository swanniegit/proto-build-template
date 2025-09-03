import openai
import time
from typing import List, Optional, AsyncGenerator
from .base_provider import BaseLLMProvider, LLMProvider, LLMModel, LLMMessage, LLMResponse

class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT provider"""
    
    def __init__(self, api_key: str, **kwargs):
        super().__init__(api_key, **kwargs)
        self.client = openai.AsyncOpenAI(api_key=api_key)
    
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate a single response using OpenAI"""
        start_time = time.time()
        
        openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
        
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            response_time = time.time() - start_time
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else None
            
            return LLMResponse(
                content=content,
                model_used=model,
                provider=LLMProvider.OPENAI,
                tokens_used=tokens_used,
                response_time=response_time
            )
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def stream_generate(
        self,
        messages: List[LLMMessage],
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response using OpenAI"""
        openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
        
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            raise Exception(f"OpenAI streaming error: {str(e)}")
    
    def get_available_models(self) -> List[LLMModel]:
        """Get available OpenAI models"""
        return [
            LLMModel(
                id="gpt-4o",
                name="GPT-4o (Latest)",
                provider=LLMProvider.OPENAI,
                context_length=128000,
                supports_streaming=True,
                cost_per_token=0.00001,
                description="Most capable GPT-4 model, great for complex tasks"
            ),
            LLMModel(
                id="gpt-4o-mini",
                name="GPT-4o Mini (Fast & Cheap)",
                provider=LLMProvider.OPENAI,
                context_length=128000,
                supports_streaming=True,
                cost_per_token=0.000001,
                description="Faster, more affordable GPT-4 model"
            ),
            LLMModel(
                id="gpt-4-turbo",
                name="GPT-4 Turbo",
                provider=LLMProvider.OPENAI,
                context_length=128000,
                supports_streaming=True,
                cost_per_token=0.00001,
                description="Previous generation GPT-4 model"
            ),
            LLMModel(
                id="gpt-3.5-turbo",
                name="GPT-3.5 Turbo (Legacy)",
                provider=LLMProvider.OPENAI,
                context_length=16385,
                supports_streaming=True,
                cost_per_token=0.000001,
                description="Legacy model, very fast and cheap"
            )
        ]
    
    def get_provider_name(self) -> LLMProvider:
        return LLMProvider.OPENAI