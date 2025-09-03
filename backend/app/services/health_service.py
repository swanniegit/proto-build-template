"""
Health monitoring service for the Neural AI Agent System
Provides comprehensive health checks for all system components
"""

import time
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

from ..llm.llm_manager import llm_manager
from ..llm.base_provider import LLMProvider, LLMMessage
from ..services.agent_template_service import agent_template_service


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass
class ComponentHealth:
    name: str
    status: HealthStatus
    message: str
    response_time: Optional[float] = None
    last_check: datetime = None
    details: Dict[str, Any] = None

    def __post_init__(self):
        if self.last_check is None:
            self.last_check = datetime.now()
        if self.details is None:
            self.details = {}


@dataclass
class SystemHealth:
    overall_status: HealthStatus
    components: List[ComponentHealth]
    total_checks: int
    healthy_components: int
    warning_components: int
    error_components: int
    last_full_check: datetime
    uptime: float


class HealthService:
    """Comprehensive health monitoring for the Neural AI System"""
    
    def __init__(self):
        self.start_time = time.time()
        self.health_history: List[SystemHealth] = []
        self.max_history_size = 100
        
    async def perform_full_health_check(self) -> SystemHealth:
        """Perform comprehensive health check of all system components"""
        print("[HEALTH] Starting full system health check...")
        start_time = time.time()
        
        components = []
        
        # Check LLM Providers
        llm_health = await self._check_llm_providers()
        components.extend(llm_health)
        
        # Check Agent Templates
        agent_health = await self._check_agent_templates()
        components.append(agent_health)
        
        # Check Database/Storage
        storage_health = await self._check_storage()
        components.append(storage_health)
        
        # Check WebSocket System
        websocket_health = await self._check_websocket_system()
        components.append(websocket_health)
        
        # Calculate overall status
        error_count = sum(1 for c in components if c.status == HealthStatus.ERROR)
        warning_count = sum(1 for c in components if c.status == HealthStatus.WARNING)
        healthy_count = sum(1 for c in components if c.status == HealthStatus.HEALTHY)
        
        if error_count > 0:
            overall_status = HealthStatus.ERROR
        elif warning_count > 0:
            overall_status = HealthStatus.WARNING
        else:
            overall_status = HealthStatus.HEALTHY
            
        system_health = SystemHealth(
            overall_status=overall_status,
            components=components,
            total_checks=len(components),
            healthy_components=healthy_count,
            warning_components=warning_count,
            error_components=error_count,
            last_full_check=datetime.now(),
            uptime=time.time() - self.start_time
        )
        
        # Store in history
        self.health_history.append(system_health)
        if len(self.health_history) > self.max_history_size:
            self.health_history.pop(0)
        
        execution_time = time.time() - start_time
        print(f"[HEALTH] Full health check completed in {execution_time:.2f}s - Status: {overall_status}")
        
        return system_health
    
    async def _check_llm_providers(self) -> List[ComponentHealth]:
        """Check health of all LLM providers"""
        components = []
        
        try:
            available_providers = llm_manager.get_available_providers()
            print(f"[HEALTH] Checking {len(available_providers)} LLM providers...")
            
            if not available_providers:
                components.append(ComponentHealth(
                    name="LLM Providers",
                    status=HealthStatus.ERROR,
                    message="No LLM providers available",
                    details={"provider_count": 0}
                ))
                return components
            
            # Test each provider
            test_message = [LLMMessage(role="user", content="Health check test - respond with 'OK'")]
            
            for provider in available_providers:
                start_time = time.time()
                try:
                    # Get a basic model for this provider
                    models = {
                        LLMProvider.OPENAI: "gpt-4o-mini",
                        LLMProvider.DEEPSEEK: "deepseek-chat",
                        LLMProvider.KIMI: "moonshot-v1-8k"
                    }
                    
                    model = models.get(provider, "gpt-4o-mini")
                    
                    response = await llm_manager.generate(
                        messages=test_message,
                        model=model,
                        provider=provider,
                        temperature=0.1,
                        max_tokens=10
                    )
                    
                    response_time = time.time() - start_time
                    
                    status = HealthStatus.HEALTHY
                    message = f"Provider responding normally"
                    
                    # Check response time thresholds
                    if response_time > 10.0:
                        status = HealthStatus.WARNING
                        message = f"Slow response time: {response_time:.2f}s"
                    elif response_time > 30.0:
                        status = HealthStatus.ERROR  
                        message = f"Very slow response time: {response_time:.2f}s"
                    
                    components.append(ComponentHealth(
                        name=f"LLM Provider: {provider.value}",
                        status=status,
                        message=message,
                        response_time=response_time,
                        details={
                            "model": model,
                            "response_length": len(response.content),
                            "tokens_used": getattr(response, 'tokens_used', 0)
                        }
                    ))
                    
                except Exception as e:
                    response_time = time.time() - start_time
                    components.append(ComponentHealth(
                        name=f"LLM Provider: {provider.value}",
                        status=HealthStatus.ERROR,
                        message=f"Provider failed: {str(e)}",
                        response_time=response_time,
                        details={"error": str(e), "error_type": type(e).__name__}
                    ))
        
        except Exception as e:
            components.append(ComponentHealth(
                name="LLM System",
                status=HealthStatus.ERROR,
                message=f"LLM system check failed: {str(e)}",
                details={"error": str(e)}
            ))
        
        return components
    
    async def _check_agent_templates(self) -> ComponentHealth:
        """Check health of agent template system"""
        try:
            start_time = time.time()
            
            collection = agent_template_service.get_all_templates()
            response_time = time.time() - start_time
            
            total_templates = len(collection.templates)
            active_templates = len(collection.active_templates)
            
            status = HealthStatus.HEALTHY
            message = f"{active_templates}/{total_templates} agent templates active"
            
            # Warning conditions
            if active_templates == 0:
                status = HealthStatus.ERROR
                message = "No active agent templates found"
            elif active_templates < 5:
                status = HealthStatus.WARNING  
                message = f"Only {active_templates} agent templates active"
            elif response_time > 1.0:
                status = HealthStatus.WARNING
                message = f"Slow template loading: {response_time:.2f}s"
            
            return ComponentHealth(
                name="Agent Templates",
                status=status,
                message=message,
                response_time=response_time,
                details={
                    "total_templates": total_templates,
                    "active_templates": active_templates,
                    "template_types": len(set(t.type for t in collection.templates))
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="Agent Templates",
                status=HealthStatus.ERROR,
                message=f"Template system failed: {str(e)}",
                details={"error": str(e)}
            )
    
    async def _check_storage(self) -> ComponentHealth:
        """Check health of storage/persistence systems"""
        try:
            start_time = time.time()
            
            # Check JSON storage system
            from ..services.json_storage_service import json_storage_service
            
            if not json_storage_service.is_connected():
                return ComponentHealth(
                    name="Storage System",
                    status=HealthStatus.ERROR,
                    message="JSON storage system not available",
                    details={"storage_type": "JSON"}
                )
            
            # Get storage statistics
            stats = await json_storage_service.get_system_stats()
            response_time = time.time() - start_time
            
            status = HealthStatus.HEALTHY
            total_users = stats.get("total_users", 0)
            total_sessions = stats.get("total_sessions", 0)
            total_agents = stats.get("total_custom_agents", 0)
            
            message = f"JSON storage active - {total_users} users, {total_sessions} sessions, {total_agents} custom agents"
            
            # Check if storage directory is accessible
            storage_dir = json_storage_service.storage_dir
            if not storage_dir.exists():
                status = HealthStatus.ERROR
                message = "Storage directory not accessible"
            
            return ComponentHealth(
                name="Storage System",
                status=status,
                message=message,
                response_time=response_time,
                details={
                    "storage_type": "JSON files",
                    "storage_location": str(storage_dir),
                    "total_users": total_users,
                    "total_sessions": total_sessions,
                    "total_custom_agents": total_agents,
                    "public_agents": stats.get("public_agents", 0)
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="Storage System", 
                status=HealthStatus.ERROR,
                message=f"Storage check failed: {str(e)}",
                details={"error": str(e)}
            )
    
    async def _check_websocket_system(self) -> ComponentHealth:
        """Check health of WebSocket connection management"""
        try:
            # Import here to avoid circular imports
            from ..websocket.manager import manager
            
            active_connections = len(manager.active_connections)
            
            status = HealthStatus.HEALTHY
            message = f"{active_connections} active WebSocket connections"
            
            # This is just informational, no error conditions for now
            return ComponentHealth(
                name="WebSocket System",
                status=status,
                message=message,
                details={
                    "active_connections": active_connections,
                    "manager_initialized": True
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="WebSocket System",
                status=HealthStatus.ERROR,
                message=f"WebSocket system check failed: {str(e)}",
                details={"error": str(e)}
            )
    
    async def get_quick_status(self) -> Dict[str, Any]:
        """Get a quick system status without full health checks"""
        try:
            # Basic checks that should be very fast
            providers = llm_manager.get_available_providers()
            templates = agent_template_service.get_all_templates()
            
            from ..websocket.manager import manager
            connections = len(manager.active_connections)
            
            return {
                "status": "online",
                "uptime": time.time() - self.start_time,
                "llm_providers": len(providers),
                "active_templates": len(templates.active_templates),
                "websocket_connections": connections,
                "last_health_check": self.health_history[-1].last_full_check.isoformat() if self.health_history else None
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "uptime": time.time() - self.start_time
            }
    
    def get_health_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent health check history"""
        recent_history = self.health_history[-limit:] if self.health_history else []
        return [
            {
                "timestamp": health.last_full_check.isoformat(),
                "overall_status": health.overall_status,
                "healthy_components": health.healthy_components,
                "warning_components": health.warning_components, 
                "error_components": health.error_components,
                "total_checks": health.total_checks
            }
            for health in recent_history
        ]


# Global health service instance
health_service = HealthService()