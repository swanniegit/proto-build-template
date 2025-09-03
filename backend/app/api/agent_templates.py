from fastapi import APIRouter, HTTPException, Body
from typing import List
from ..models.agent_templates import (
    AgentTemplate,
    AgentTemplateCollection, 
    CreateAgentTemplateRequest,
    UpdateAgentTemplateRequest,
    AgentTemplateType
)
from ..services.agent_template_service import agent_template_service

router = APIRouter(prefix="/api/agent-templates", tags=["Agent Templates"])

@router.get("/", response_model=AgentTemplateCollection)
async def get_all_templates():
    """Get all agent templates"""
    return agent_template_service.get_all_templates()

@router.get("/active", response_model=List[AgentTemplate])
async def get_active_templates():
    """Get only active agent templates"""
    return agent_template_service.get_active_templates()

@router.get("/{template_id}", response_model=AgentTemplate)
async def get_template(template_id: str):
    """Get a specific template by ID"""
    template = agent_template_service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.post("/", response_model=AgentTemplate)
async def create_template(request: CreateAgentTemplateRequest):
    """Create a new custom agent template"""
    return agent_template_service.create_template(request)

@router.put("/{template_id}", response_model=AgentTemplate)
async def update_template(template_id: str, request: UpdateAgentTemplateRequest):
    """Update an existing template"""
    template = agent_template_service.update_template(template_id, request)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Delete a custom template (cannot delete default templates)"""
    success = agent_template_service.delete_template(template_id)
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete template - either not found or is a default template"
        )
    return {"message": "Template deleted successfully"}

@router.post("/set-active")
async def set_active_templates(template_ids: List[str] = Body(...)):
    """Set which templates are active"""
    success = agent_template_service.set_active_templates(template_ids)
    if not success:
        raise HTTPException(status_code=400, detail="One or more template IDs not found")
    return {"message": "Active templates updated successfully"}

@router.get("/by-type/{agent_type}", response_model=AgentTemplate)
async def get_template_by_type(agent_type: AgentTemplateType):
    """Get the first active template of a specific type"""
    template = agent_template_service.get_template_by_type(agent_type)
    if not template:
        raise HTTPException(
            status_code=404, 
            detail=f"No active template found for agent type: {agent_type}"
        )
    return template

@router.post("/{template_id}/duplicate", response_model=AgentTemplate)
async def duplicate_template(template_id: str, new_name: str = Body(..., embed=True)):
    """Duplicate an existing template"""
    template = agent_template_service.duplicate_template(template_id, new_name)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.get("/types/all")
async def get_all_agent_types():
    """Get all available agent types"""
    return {"agent_types": [agent_type.value for agent_type in AgentTemplateType]}