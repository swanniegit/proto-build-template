from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from ..llm.llm_manager import llm_manager
from ..llm.base_provider import LLMProvider, LLMMessage

router = APIRouter(prefix="/api/llm", tags=["LLM Providers"])

class ChatRequest(BaseModel):
    messages: List[dict]  # List of {role: str, content: str}
    model: str
    provider: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = False

class ChatResponse(BaseModel):
    content: str
    model_used: str
    provider: str
    tokens_used: Optional[int] = None
    response_time: Optional[float] = None

@router.get("/providers")
async def get_available_providers():
    """Get all available LLM providers and their status"""
    try:
        status = llm_manager.get_provider_status()
        return {
            "providers": status,
            "available_count": len(llm_manager.get_available_providers())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get providers: {str(e)}")

@router.get("/models")
async def get_available_models(provider: Optional[str] = None):
    """Get all available models, optionally filtered by provider"""
    try:
        provider_enum = None
        if provider:
            try:
                provider_enum = LLMProvider(provider)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
        
        models = llm_manager.get_available_models(provider_enum)
        return {
            "models": [model.model_dump() for model in models],
            "count": len(models)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """Generate a chat completion using the specified model and provider"""
    try:
        # Convert dict messages to LLMMessage objects
        messages = [LLMMessage(role=msg["role"], content=msg["content"]) for msg in request.messages]
        
        # Convert provider string to enum if provided
        provider_enum = None
        if request.provider:
            try:
                provider_enum = LLMProvider(request.provider)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")
        
        if request.stream:
            raise HTTPException(status_code=400, detail="Streaming not supported in this endpoint. Use WebSocket for streaming.")
        
        # Generate response
        response = await llm_manager.generate(
            messages=messages,
            model=request.model,
            provider=provider_enum,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            content=response.content,
            model_used=response.model_used,
            provider=response.provider.value,
            tokens_used=response.tokens_used,
            response_time=response.response_time
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")

@router.get("/test")
async def test_providers():
    """Test all available providers with a simple message"""
    try:
        test_messages = [
            LLMMessage(role="system", content="You are a helpful AI assistant."),
            LLMMessage(role="user", content="Say 'Hello from [Provider Name]!' and nothing else.")
        ]
        
        results = {}
        available_providers = llm_manager.get_available_providers()
        
        for provider in available_providers:
            try:
                models = llm_manager.get_available_models(provider)
                if models:
                    # Test with the first available model
                    test_model = models[0].id
                    response = await llm_manager.generate(
                        messages=test_messages,
                        model=test_model,
                        provider=provider,
                        temperature=0.7,
                        max_tokens=50
                    )
                    results[provider.value] = {
                        "status": "success",
                        "model_tested": test_model,
                        "response": response.content,
                        "response_time": response.response_time
                    }
                else:
                    results[provider.value] = {
                        "status": "error",
                        "error": "No models available"
                    }
            except Exception as e:
                results[provider.value] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return {
            "test_results": results,
            "providers_tested": len(results)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider test failed: {str(e)}")