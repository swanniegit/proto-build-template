"""
Health monitoring API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from ..services.health_service import health_service, SystemHealth, ComponentHealth

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("/")
async def get_system_health():
    """Get complete system health status"""
    try:
        health = await health_service.perform_full_health_check()
        return {
            "status": health.overall_status,
            "components": [
                {
                    "name": c.name,
                    "status": c.status,
                    "message": c.message,
                    "response_time": c.response_time,
                    "last_check": c.last_check.isoformat(),
                    "details": c.details
                }
                for c in health.components
            ],
            "summary": {
                "total_checks": health.total_checks,
                "healthy_components": health.healthy_components,
                "warning_components": health.warning_components,
                "error_components": health.error_components,
                "uptime": health.uptime,
                "last_full_check": health.last_full_check.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/quick")
async def get_quick_health():
    """Get quick health status for UI indicators"""
    try:
        status = await health_service.get_quick_status()
        return status
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "uptime": 0
        }

@router.get("/history")
async def get_health_history(limit: int = 20):
    """Get health check history"""
    try:
        history = health_service.get_health_history(limit)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health history: {str(e)}")

@router.get("/errors")
async def get_error_log():
    """Get recent errors and issues"""
    try:
        # Get the most recent health check
        health = await health_service.perform_full_health_check()
        
        errors = []
        warnings = []
        
        for component in health.components:
            if component.status == "error":
                errors.append({
                    "component": component.name,
                    "message": component.message,
                    "timestamp": component.last_check.isoformat(),
                    "details": component.details
                })
            elif component.status == "warning":
                warnings.append({
                    "component": component.name,
                    "message": component.message,
                    "timestamp": component.last_check.isoformat(),
                    "details": component.details
                })
        
        return {
            "errors": errors,
            "warnings": warnings,
            "total_issues": len(errors) + len(warnings),
            "last_check": health.last_full_check.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get error log: {str(e)}")