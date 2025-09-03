"""
Development Pipeline API - Handles Epic-Stories generation and file downloads
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ..services.epic_stories_pipeline import epic_stories_pipeline
import os

router = APIRouter()


class PipelineRequest(BaseModel):
    session_id: str
    user_input: str
    context: Dict[str, Any] = {}
    llm_settings: Dict[str, Any] = {}


class PipelineResponse(BaseModel):
    pipeline_id: str
    status: str
    message: str


class PipelineStatusResponse(BaseModel):
    pipeline_id: str
    status: str
    progress: Dict[str, str]
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    final_file: Optional[str] = None
    error: Optional[str] = None


@router.post("/development-pipeline/start", response_model=PipelineResponse)
async def start_development_pipeline(request: PipelineRequest):
    """Start the Epic-Stories development pipeline"""
    try:
        pipeline_id = await epic_stories_pipeline.start_pipeline(
            session_id=request.session_id,
            user_input=request.user_input,
            context=request.context,
            llm_settings=request.llm_settings
        )
        
        return PipelineResponse(
            pipeline_id=pipeline_id,
            status="started",
            message=f"Development pipeline started. Pipeline ID: {pipeline_id}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline: {str(e)}")


@router.get("/development-pipeline/status/{pipeline_id}", response_model=PipelineStatusResponse)
async def get_pipeline_status(pipeline_id: str):
    """Get the current status of a development pipeline"""
    status_info = epic_stories_pipeline.get_pipeline_status(pipeline_id)
    
    if not status_info:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return PipelineStatusResponse(
        pipeline_id=pipeline_id,
        status=status_info["status"],
        progress=status_info["progress"],
        created_at=status_info["created_at"].isoformat() if status_info.get("created_at") else None,
        completed_at=status_info["completed_at"].isoformat() if status_info.get("completed_at") else None,
        final_file=status_info.get("final_file"),
        error=status_info.get("error")
    )


@router.get("/development-pipeline/download/{pipeline_id}")
async def download_development_plan(pipeline_id: str):
    """Download the completed development plan file"""
    file_path = epic_stories_pipeline.get_download_file(pipeline_id)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Development plan not ready or not found")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    filename = f"development_plan_{pipeline_id}.md"
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='text/markdown',
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/development-pipeline/list")
async def list_active_pipelines():
    """List all active pipelines"""
    pipelines = []
    for pipeline_id, info in epic_stories_pipeline.active_pipelines.items():
        pipelines.append({
            "pipeline_id": pipeline_id,
            "status": info["status"],
            "session_id": info["session_id"],
            "created_at": info["created_at"].isoformat() if info.get("created_at") else None,
            "progress": info["progress"]
        })
    
    return {"pipelines": pipelines}