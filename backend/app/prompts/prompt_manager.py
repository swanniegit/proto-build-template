import os
from pathlib import Path
from typing import Dict, Optional

class PromptManager:
    """Manages reading and writing of prompt files"""
    
    def __init__(self):
        self.prompts_dir = Path(__file__).parent
        
    def get_prompt(self, prompt_name: str) -> str:
        """Read a prompt from file"""
        prompt_file = self.prompts_dir / f"{prompt_name}.txt"
        try:
            with open(prompt_file, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read().strip()
        except FileNotFoundError:
            # Return default prompt if file doesn't exist
            return self._get_default_prompt(prompt_name)
        except Exception as e:
            print(f"Error reading prompt {prompt_name}: {e}")
            return self._get_default_prompt(prompt_name)
    
    def save_prompt(self, prompt_name: str, content: str) -> bool:
        """Save a prompt to file"""
        prompt_file = self.prompts_dir / f"{prompt_name}.txt"
        try:
            # Clean content of problematic characters
            clean_content = content.encode('utf-8', errors='ignore').decode('utf-8').strip()
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(clean_content)
            return True
        except Exception as e:
            print(f"Error saving prompt {prompt_name}: {e}")
            return False
    
    def list_prompts(self) -> Dict[str, str]:
        """List all available prompts"""
        prompts = {}
        print(f"[PROMPT-MANAGER] Scanning directory: {self.prompts_dir}")
        print(f"[PROMPT-MANAGER] Directory exists: {self.prompts_dir.exists()}")
        
        for file_path in self.prompts_dir.glob("*.txt"):
            prompt_name = file_path.stem
            print(f"[PROMPT-MANAGER] Found prompt file: {prompt_name}")
            prompts[prompt_name] = self.get_prompt(prompt_name)
        
        print(f"[PROMPT-MANAGER] Loaded {len(prompts)} prompts: {list(prompts.keys())}")
        return prompts
    
    def _get_default_prompt(self, prompt_name: str) -> str:
        """Return default prompt if file doesn't exist"""
        defaults = {
            "single_agent_prompt": """You are a UI prototype generator. You maintain and evolve a UI based on user requests.

INSTRUCTIONS:
1. If user says "add" or "include" - ADD to existing prototype
2. If user says "change" or "make it" - MODIFY existing elements  
3. If user says "remove" or "delete" - REMOVE elements
4. If user says "create" or "new" - START fresh
5. For multi-screen prototypes, create multiple screen components with navigation

IMPORTANT: 
- For interactive elements like buttons, use "action" property to describe behavior
- DO NOT include JavaScript code strings in props
- Use semantic HTML components (button, input, form, div, h1, h2, etc.)

Common patterns:
- Login form: email input, password input, submit button
- Card: div with border, padding, shadow
- Button: include "action" property describing the behavior
- Form: include "action" property describing form submission"""
        }
        return defaults.get(prompt_name, "Default prompt not available.")

# Global instance
prompt_manager = PromptManager()