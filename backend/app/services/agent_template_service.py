from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import os
from ..models.agent_templates import (
    AgentTemplate, 
    AgentTemplateCollection, 
    DEFAULT_AGENT_TEMPLATES,
    CreateAgentTemplateRequest,
    UpdateAgentTemplateRequest,
    AgentTemplateType
)

class AgentTemplateService:
    """Service for managing agent templates"""
    
    def __init__(self):
        self.templates: Dict[str, AgentTemplate] = {}
        self.active_templates: List[str] = []
        self.templates_file = "agent_templates.json"
        self._load_default_templates()
        self._load_templates_from_file()
    
    def _load_default_templates(self):
        """Load default agent templates"""
        for template_data in DEFAULT_AGENT_TEMPLATES:
            template = AgentTemplate(
                **template_data,
                is_custom=False,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            self.templates[template.id] = template
            self.active_templates.append(template.id)
    
    def _load_templates_from_file(self):
        """Load templates from JSON file if it exists"""
        if os.path.exists(self.templates_file):
            try:
                with open(self.templates_file, 'r', encoding='utf-8-sig') as f:
                    data = json.load(f)
                    for template_data in data.get('templates', []):
                        template = AgentTemplate(**template_data)
                        self.templates[template.id] = template
                    
                    # Load active templates list
                    self.active_templates = data.get('active_templates', list(self.templates.keys()))
            except Exception as e:
                print(f"Error loading templates from file: {e}")
    
    def _save_templates_to_file(self):
        """Save templates to JSON file"""
        try:
            data = {
                'templates': [template.dict() for template in self.templates.values()],
                'active_templates': self.active_templates
            }
            with open(self.templates_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving templates to file: {e}")
    
    def get_all_templates(self) -> AgentTemplateCollection:
        """Get all agent templates"""
        return AgentTemplateCollection(
            templates=list(self.templates.values()),
            active_templates=self.active_templates
        )
    
    def get_active_templates(self) -> List[AgentTemplate]:
        """Get only active agent templates"""
        return [self.templates[template_id] for template_id in self.active_templates 
                if template_id in self.templates]
    
    def get_template(self, template_id: str) -> Optional[AgentTemplate]:
        """Get a specific template by ID"""
        return self.templates.get(template_id)
    
    def create_template(self, request: CreateAgentTemplateRequest) -> AgentTemplate:
        """Create a new custom agent template"""
        template_id = f"{request.type}_{datetime.now().timestamp()}"
        
        template = AgentTemplate(
            id=template_id,
            name=request.name,
            type=request.type,
            description=request.description,
            prompt=request.prompt,
            color=request.color,
            icon=request.icon,
            is_active=True,
            is_custom=True,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        self.templates[template_id] = template
        self.active_templates.append(template_id)
        self._save_templates_to_file()
        
        return template
    
    def update_template(self, template_id: str, request: UpdateAgentTemplateRequest) -> Optional[AgentTemplate]:
        """Update an existing template"""
        if template_id not in self.templates:
            return None
        
        template = self.templates[template_id]
        
        # Update fields if provided
        if request.name is not None:
            template.name = request.name
        if request.description is not None:
            template.description = request.description
        if request.prompt is not None:
            template.prompt = request.prompt
        if request.color is not None:
            template.color = request.color
        if request.icon is not None:
            template.icon = request.icon
        if request.is_active is not None:
            template.is_active = request.is_active
            if request.is_active and template_id not in self.active_templates:
                self.active_templates.append(template_id)
            elif not request.is_active and template_id in self.active_templates:
                self.active_templates.remove(template_id)
        
        template.updated_at = datetime.now().isoformat()
        self._save_templates_to_file()
        
        return template
    
    def delete_template(self, template_id: str) -> bool:
        """Delete a custom template (cannot delete default templates)"""
        if template_id not in self.templates:
            return False
        
        template = self.templates[template_id]
        if not template.is_custom:
            return False  # Cannot delete default templates
        
        del self.templates[template_id]
        if template_id in self.active_templates:
            self.active_templates.remove(template_id)
        
        self._save_templates_to_file()
        return True
    
    def set_active_templates(self, template_ids: List[str]) -> bool:
        """Set which templates are active"""
        # Validate all template IDs exist
        for template_id in template_ids:
            if template_id not in self.templates:
                return False
        
        self.active_templates = template_ids
        
        # Update active status on all templates
        for template in self.templates.values():
            template.is_active = template.id in template_ids
        
        self._save_templates_to_file()
        return True
    
    def get_template_by_type(self, agent_type: AgentTemplateType) -> Optional[AgentTemplate]:
        """Get the first active template of a specific type"""
        for template_id in self.active_templates:
            if template_id in self.templates:
                template = self.templates[template_id]
                if template.type == agent_type:
                    return template
        return None
    
    def duplicate_template(self, template_id: str, new_name: str) -> Optional[AgentTemplate]:
        """Duplicate an existing template"""
        if template_id not in self.templates:
            return None
        
        original = self.templates[template_id]
        new_template_id = f"{original.type}_{datetime.now().timestamp()}"
        
        template = AgentTemplate(
            id=new_template_id,
            name=new_name,
            type=original.type,
            description=original.description,
            prompt=original.prompt,
            color=original.color,
            icon=original.icon,
            is_active=True,
            is_custom=True,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        self.templates[new_template_id] = template
        self.active_templates.append(new_template_id)
        self._save_templates_to_file()
        
        return template

# Global instance
agent_template_service = AgentTemplateService()