from typing import List, Dict, Any, Optional
from ..models.agent_models import AgentType, AgentResponse, SharedAgentMemory
from dataclasses import dataclass


@dataclass
class HandoffDecision:
    """Represents a decision about agent handoffs and workload distribution."""
    primary_agent: AgentType
    supporting_agents: List[AgentType]
    requires_parallel_processing: bool
    requires_synthesis: bool
    confidence: float
    reasoning: str


@dataclass
class WorkloadAssignment:
    """Represents a specific task assignment for an agent."""
    agent_type: AgentType
    priority: int  # 1 = highest priority
    focus_areas: List[str]
    specific_questions: List[str]
    dependencies: List[AgentType]


class HandoffCoordinator:
    """Coordinates agent handoffs and workload distribution in multi-agent workflows."""
    
    def __init__(self, shared_memory: SharedAgentMemory):
        self.shared_memory = shared_memory
        
    def evaluate_handoff_needs(
        self, 
        user_input: str, 
        current_agent: AgentType, 
        recent_responses: List[AgentResponse]
    ) -> HandoffDecision:
        """Evaluate whether agent handoffs are needed based on the user input."""
        
        # Analyze the user input for complexity and domain requirements
        input_lower = user_input.lower()
        
        # Determine primary agent based on input content
        if any(keyword in input_lower for keyword in ['visual', 'design', 'color', 'layout', 'aesthetic']):
            primary = AgentType.UI_DESIGNER
        elif any(keyword in input_lower for keyword in ['user', 'experience', 'usability', 'accessibility', 'flow']):
            primary = AgentType.UX_RESEARCHER
        elif any(keyword in input_lower for keyword in ['technical', 'implement', 'code', 'performance', 'architecture']):
            primary = AgentType.DEVELOPER
        elif any(keyword in input_lower for keyword in ['business', 'requirement', 'feature', 'product', 'strategy']):
            primary = AgentType.PRODUCT_MANAGER
        else:
            primary = current_agent  # Default to current if unclear
        
        # Determine supporting agents based on complexity
        supporting = []
        if len(input_lower.split()) > 20:  # Complex request
            supporting = [agent for agent in AgentType if agent != primary][:2]  # Limit to 2 supporting
        elif any(keyword in input_lower for keyword in ['comprehensive', 'complete', 'full', 'detailed']):
            supporting = [agent for agent in AgentType if agent != primary][:3]
        
        # Determine if parallel processing is needed
        requires_parallel = len(supporting) > 0
        
        # Determine if synthesis is needed
        requires_synthesis = len(supporting) > 1
        
        return HandoffDecision(
            primary_agent=primary,
            supporting_agents=supporting,
            requires_parallel_processing=requires_parallel,
            requires_synthesis=requires_synthesis,
            confidence=0.8,  # Could be more sophisticated
            reasoning=f"Primary: {primary.value}, Supporting: {[s.value for s in supporting]}"
        )
    
    def create_workload_assignments(
        self, 
        decision: HandoffDecision, 
        user_input: str
    ) -> List[WorkloadAssignment]:
        """Create specific workload assignments for each agent."""
        assignments = []
        
        # Primary agent assignment
        primary_assignment = WorkloadAssignment(
            agent_type=decision.primary_agent,
            priority=1,
            focus_areas=self._get_focus_areas(decision.primary_agent, user_input),
            specific_questions=self._get_specific_questions(decision.primary_agent, user_input),
            dependencies=[]
        )
        assignments.append(primary_assignment)
        
        # Supporting agent assignments
        for i, agent_type in enumerate(decision.supporting_agents):
            supporting_assignment = WorkloadAssignment(
                agent_type=agent_type,
                priority=i + 2,  # Lower priority than primary
                focus_areas=self._get_focus_areas(agent_type, user_input),
                specific_questions=self._get_specific_questions(agent_type, user_input),
                dependencies=[decision.primary_agent] if not decision.requires_parallel_processing else []
            )
            assignments.append(supporting_assignment)
        
        return assignments
    
    def _get_focus_areas(self, agent_type: AgentType, user_input: str) -> List[str]:
        """Get focus areas for a specific agent type based on user input."""
        focus_map = {
            AgentType.UI_DESIGNER: ["Visual design", "Layout structure", "Color scheme", "Typography"],
            AgentType.UX_RESEARCHER: ["User experience", "Usability", "Accessibility", "User flows"],
            AgentType.DEVELOPER: ["Technical feasibility", "Implementation approach", "Performance", "Architecture"],
            AgentType.PRODUCT_MANAGER: ["Business requirements", "User needs", "Feature prioritization", "Strategy"]
        }
        return focus_map.get(agent_type, ["General analysis"])
    
    def _get_specific_questions(self, agent_type: AgentType, user_input: str) -> List[str]:
        """Generate specific questions for each agent to address."""
        question_templates = {
            AgentType.UI_DESIGNER: [
                "How can the visual hierarchy be improved?",
                "What design patterns would work best here?",
                "Are there any visual accessibility concerns?"
            ],
            AgentType.UX_RESEARCHER: [
                "How does this align with user needs?",
                "What usability issues might arise?",
                "How can the user flow be optimized?"
            ],
            AgentType.DEVELOPER: [
                "What are the technical implementation challenges?",
                "How can performance be optimized?",
                "What architecture decisions are needed?"
            ],
            AgentType.PRODUCT_MANAGER: [
                "How does this align with business goals?",
                "What's the priority of different features?",
                "What are the success metrics?"
            ]
        }
        return question_templates.get(agent_type, ["How can this be improved?"])
    
    def create_enriched_context(
        self,
        agent_type: AgentType,
        user_input: str,
        assignment: WorkloadAssignment,
        peer_assignments: List[WorkloadAssignment]
    ) -> str:
        """Create enriched context for an agent including peer coordination info."""
        context_parts = [
            f"USER REQUEST: {user_input}",
            "",
            f"YOUR ROLE: {agent_type.value.replace('_', ' ').title()}",
            f"PRIORITY: {assignment.priority}",
            "",
            "FOCUS AREAS:",
        ]
        
        for area in assignment.focus_areas:
            context_parts.append(f"- {area}")
        
        context_parts.extend([
            "",
            "SPECIFIC QUESTIONS TO ADDRESS:",
        ])
        
        for question in assignment.specific_questions:
            context_parts.append(f"- {question}")
        
        if peer_assignments:
            context_parts.extend([
                "",
                "PEER AGENT COORDINATION:",
            ])
            for peer in peer_assignments:
                context_parts.append(f"- {peer.agent_type.value}: {', '.join(peer.focus_areas[:2])}")
        
        return "\n".join(context_parts)
    
    def synthesize_responses(
        self, 
        agent_responses: List[AgentResponse], 
        user_input: str
    ) -> Dict[str, Any]:
        """Synthesize multiple agent responses into coordinated insights."""
        synthesis = {
            "coordination_summary": f"Processed by {len(agent_responses)} agents",
            "common_themes": [],
            "conflicting_recommendations": [],
            "next_steps": [],
            "overall_confidence": 0.0
        }
        
        # Simple synthesis logic - could be more sophisticated
        all_suggestions = []
        for response in agent_responses:
            all_suggestions.extend(response.suggestions)
        
        # Find common themes (simplified)
        suggestion_counts = {}
        for suggestion in all_suggestions:
            # Very basic keyword matching for themes
            for word in suggestion.lower().split():
                if len(word) > 4:  # Only meaningful words
                    suggestion_counts[word] = suggestion_counts.get(word, 0) + 1
        
        # Common themes are words mentioned by multiple agents
        common_themes = [word for word, count in suggestion_counts.items() if count > 1]
        synthesis["common_themes"] = common_themes[:5]  # Top 5
        
        # Calculate overall confidence
        if agent_responses:
            synthesis["overall_confidence"] = sum(
                getattr(response, 'confidence_level', 0.8) for response in agent_responses
            ) / len(agent_responses)
        
        synthesis["next_steps"] = [
            "Review agent recommendations",
            "Implement high-priority suggestions",
            "Consider agent coordination feedback"
        ]
        
        return synthesis