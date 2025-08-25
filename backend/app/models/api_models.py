from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Pydantic models for structured outputs
class ComponentProps(BaseModel):
    className: Optional[str] = None
    style: Optional[Dict[str, str]] = None
    id: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow additional properties for flexibility

class PrototypeComponent(BaseModel):
    component: str
    props: Optional[ComponentProps] = None
    children: Optional[List['PrototypeComponent']] = None
    text: Optional[str] = None

class MultiScreenPrototype(BaseModel):
    screens: List[PrototypeComponent]

class SinglePrototype(BaseModel):
    component: str
    props: Optional[ComponentProps] = None
    children: Optional[List[PrototypeComponent]] = None
    text: Optional[str] = None

class DocumentResponse(BaseModel):
    content: str

class PRDDocument(BaseModel):
    id: str
    title: str
    content: str
    version: int
    refined_by: List[str] = []
    created_at: str
    updated_at: str

class RefinementStage(BaseModel):
    stage: int
    agent_type: str
    input: str
    output: str
    improvements: List[str] = []
    timestamp: str

class PRDRefinementData(BaseModel):
    original: PRDDocument
    stages: List[RefinementStage] = []
    final: PRDDocument
    status: str = "idle"

# Update forward references for self-referencing models
PrototypeComponent.model_rebuild()
