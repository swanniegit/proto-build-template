from datetime import datetime
from typing import Dict, Any, List, Optional
import json


class SessionMemory:
    """Manages session memory with learning capabilities for user preferences and patterns."""
    
    def __init__(self):
        self.corrections = []
        self.preferences = {}
        self.component_history = []
    
    def learn_from_change(self, before: Dict[str, Any], after: Dict[str, Any], user_input: str):
        """Track what changed to learn patterns"""
        change = {
            "before": before,
            "after": after,
            "trigger": user_input,
            "timestamp": datetime.now().isoformat()
        }
        
        # Detect pattern type
        if "color" in user_input.lower():
            self.preferences["color_preference"] = self._extract_color(after)
        elif "button" in user_input.lower():
            self.preferences["button_style"] = self._extract_button_style(after)
        
        self.corrections.append(change)
    
    def _extract_color(self, prototype: Dict[str, Any]) -> Optional[str]:
        """Extract color information from prototype"""
        # Simple color extraction logic
        if isinstance(prototype, dict) and "props" in prototype:
            style = prototype.get("props", {}).get("style", {})
            return style.get("color") or style.get("backgroundColor")
        return None
    
    def _extract_button_style(self, prototype: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract button style information"""
        if isinstance(prototype, dict) and prototype.get("component") == "button":
            return prototype.get("props", {}).get("style", {})
        return None
    
    def apply_learned_preferences(self, prototype: Dict[str, Any]) -> Dict[str, Any]:
        """Apply learned preferences to new prototypes"""
        if "color_preference" in self.preferences:
            # Apply learned color scheme
            prototype = self._apply_color_scheme(prototype, self.preferences["color_preference"])
        
        return prototype
    
    def _apply_color_scheme(self, prototype: Dict[str, Any], color: str) -> Dict[str, Any]:
        """Apply color scheme to prototype"""
        if isinstance(prototype, dict):
            if "props" not in prototype:
                prototype["props"] = {}
            if "style" not in prototype["props"]:
                prototype["props"]["style"] = {}
            prototype["props"]["style"]["color"] = color
            
            # Apply to children
            if "children" in prototype:
                for child in prototype["children"]:
                    self._apply_color_scheme(child, color)
        
        return prototype
    
    def get_context_summary(self) -> str:
        """Get a summary of learned preferences for AI context"""
        summary_parts = []
        
        if self.preferences:
            summary_parts.append("User preferences:")
            for key, value in self.preferences.items():
                summary_parts.append(f"- {key}: {value}")
        
        if self.corrections:
            recent_corrections = self.corrections[-3:]  # Last 3 corrections
            summary_parts.append("Recent corrections:")
            for correction in recent_corrections:
                summary_parts.append(f"- Changed after: '{correction['trigger']}'")
        
        return "\n".join(summary_parts) if summary_parts else "No learned preferences yet."