import openai
import json
from typing import Dict, Any, List, Tuple, Optional

from ..core.config import OPENAI_API_KEY
from ..models.api_models import SinglePrototype, MultiScreenPrototype
from ..prompts.prompt_manager import prompt_manager


async def generate_prototype_v3(
    user_input: str, 
    history: List[str], 
    current_prototype: Dict[str, Any], 
    previous_response_id: Optional[str] = None
) -> Tuple[Dict[str, Any], Optional[str]]:
    """Generate prototype using GPT-5 Responses API with stateful conversations"""
    
    # Build context from history
    context = "\n".join([f"User said: {h}" for h in history[-5:]])
    
    # Determine if user wants multi-screen or single screen
    wants_multi_screen = any(word in user_input.lower() for word in ['screens', 'multiple screens', 'navigation', 'pages'])
    
    instructions = prompt_manager.get_prompt("single_agent_prompt")

    user_prompt = f"""CURRENT STATE:
{json.dumps(current_prototype, indent=2) if current_prototype else "Empty - no prototype yet"}

CONVERSATION HISTORY:
{context}

NEW REQUEST:
{user_input}

Generate the appropriate UI prototype structure as JSON."""

    try:
        print(f"Generating prototype with GPT-5 Responses API")
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        # Build request parameters
        request_params = {
            "model": "gpt-5",
            "instructions": instructions,
            "input": user_prompt,
            "temperature": 0.3
        }
        
        # Add previous response ID for stateful conversation if available
        if previous_response_id:
            request_params["previous_response_id"] = previous_response_id
            print(f"Using previous response ID for context: {previous_response_id}")
        
        # Use structured outputs for JSON response
        if wants_multi_screen:
            request_params["text"] = {"format": {"type": "json_schema", "json_schema": {"schema": MultiScreenPrototype.model_json_schema(), "strict": True}}}
        else:
            request_params["text"] = {"format": {"type": "json_schema", "json_schema": {"schema": SinglePrototype.model_json_schema(), "strict": True}}}
        
        response = client.responses.create(**request_params)
        
        # Extract the prototype data and response ID
        result = json.loads(response.output_text)
        response_id = response.id
        
        print(f"Successfully generated structured prototype with Responses API")
        return result, response_id
        
    except Exception as e:
        print(f"GPT-5 Responses API generation failed: {e}")
        # Fallback to the old structured outputs method
        try:
            result = await generate_prototype_v2(user_input, history, current_prototype)
            return result, None  # No response ID from fallback
        except Exception as fallback_e:
            print(f"Fallback generation also failed: {fallback_e}")
            error_result = {
                "component": "div",
                "props": {"className": "error", "style": {"color": "red"}},
                "text": f"Error: Could not generate prototype with GPT-5. Try rephrasing your request."
            }
            return error_result, None


async def generate_prototype_v2(user_input: str, history: List[str], current_prototype: Dict[str, Any]) -> Dict[str, Any]:
    """Improved version with structured outputs using GPT-4"""
    
    # Build context from history
    context = "\n".join([f"User said: {h}" for h in history[-5:]])
    
    # Determine if user wants multi-screen or single screen
    wants_multi_screen = any(word in user_input.lower() for word in ['screens', 'multiple screens', 'navigation', 'pages'])
    
    system_prompt = prompt_manager.get_prompt("single_agent_prompt")

    user_prompt = f"""CURRENT STATE:
{json.dumps(current_prototype, indent=2) if current_prototype else "Empty - no prototype yet"}

CONVERSATION HISTORY:
{context}

NEW REQUEST:
{user_input}

Generate the appropriate UI prototype structure."""

    try:
        print(f"Generating prototype with structured outputs")
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        if wants_multi_screen:
            # Use multi-screen response format
            response = client.beta.chat.completions.parse(
                model="gpt-4o-2024-08-06",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format=MultiScreenPrototype,
                temperature=0.3
            )
            result = response.choices[0].parsed.model_dump()
        else:
            # Use single prototype response format
            response = client.beta.chat.completions.parse(
                model="gpt-4o-2024-08-06",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format=SinglePrototype,
                temperature=0.3
            )
            result = response.choices[0].parsed.model_dump()
        
        print(f"Successfully generated structured prototype")
        return result
        
    except Exception as e:
        print(f"Structured output generation failed: {e}")
        # Fallback to original method if structured outputs fail
        return await generate_prototype_fallback(user_input, history, current_prototype)


async def generate_prototype_fallback(user_input: str, history: List[str], current_prototype: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback method using traditional JSON parsing"""
    context = "\n".join([f"User said: {h}" for h in history[-5:]])
    
    prompt = f"""You are a UI prototype generator. Return valid JSON only.

Current prototype: {json.dumps(current_prototype, indent=2) if current_prototype else "Empty"}
History: {context}
New request: {user_input}

Return a JSON structure with component, props (optional), children (optional), and text (optional) fields."""

    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are a UI generator. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        # Clean up response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
        
    except Exception as e:
        print(f"Fallback generation failed: {e}")
        return {
            "component": "div",
            "props": {"className": "error", "style": {"color": "red"}},
            "text": f"Error: Could not generate prototype. Try rephrasing your request."
        }