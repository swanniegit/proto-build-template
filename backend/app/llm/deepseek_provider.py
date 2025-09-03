import httpx
import json
import time
from typing import List, Optional, AsyncGenerator
from .base_provider import BaseLLMProvider, LLMProvider, LLMModel, LLMMessage, LLMResponse

class DeepSeekProvider(BaseLLMProvider):
    """DeepSeek AI provider"""
    
    def __init__(self, api_key: str, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = kwargs.get("base_url", "https://api.deepseek.com/v1")
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=120.0,  # Increased timeout for parallel requests
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        )
    
    async def generate(
        self,
        messages: List[LLMMessage],
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate a single response using DeepSeek"""
        start_time = time.time()
        
        payload = {
            "model": model,
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "temperature": temperature,
            "stream": False
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload
            )
            response.raise_for_status()
            
            response_data = response.json()
            response_time = time.time() - start_time
            
            content = response_data["choices"][0]["message"]["content"]
            tokens_used = response_data.get("usage", {}).get("total_tokens")
            
            return LLMResponse(
                content=content,
                model_used=model,
                provider=LLMProvider.DEEPSEEK,
                tokens_used=tokens_used,
                response_time=response_time
            )
            
        except httpx.HTTPStatusError as e:
            error_detail = ""
            try:
                error_detail = e.response.text
            except:
                error_detail = str(e)
            raise Exception(f"DeepSeek API error: {e.response.status_code} - {error_detail}")
        except Exception as e:
            import traceback
            full_error = traceback.format_exc()
            print(f"[DeepSeek Debug] Full error: {full_error}")
            raise Exception(f"DeepSeek error: {str(e)} (Type: {type(e).__name__})")
    
    async def stream_generate(
        self,
        messages: List[LLMMessage],
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response using DeepSeek"""
        payload = {
            "model": model,
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "temperature": temperature,
            "stream": True
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str.strip() == "[DONE]":
                            break
                            
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta and delta["content"]:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue
                            
        except httpx.HTTPStatusError as e:
            raise Exception(f"DeepSeek streaming error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise Exception(f"DeepSeek streaming error: {str(e)}")
    
    def get_available_models(self) -> List[LLMModel]:
        """Get available DeepSeek models"""
        return [
            LLMModel(
                id="deepseek-chat",
                name="DeepSeek Chat",
                provider=LLMProvider.DEEPSEEK,
                context_length=32768,
                supports_streaming=True,
                cost_per_token=0.000001,  # Very affordable
                description="DeepSeek's flagship conversational AI model"
            ),
            LLMModel(
                id="deepseek-coder",
                name="DeepSeek Coder",
                provider=LLMProvider.DEEPSEEK,
                context_length=16384,
                supports_streaming=True,
                cost_per_token=0.000001,
                description="Specialized for coding and programming tasks"
            )
        ]
    
    def get_provider_name(self) -> LLMProvider:
        return LLMProvider.DEEPSEEK