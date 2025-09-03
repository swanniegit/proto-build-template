import asyncio
import json
from typing import Dict, Any, List
from datetime import datetime
from ..models.agent_templates import AgentTemplate, AgentExecutionResult, AgentTemplateType
from ..services.agent_template_service import agent_template_service
from ..llm.llm_manager import llm_manager
from ..llm.base_provider import LLMMessage

class TemplateAgentExecutor:
    """Executes agents based on templates"""
    
    def __init__(self):
        self.llm_manager = llm_manager
    
    async def execute_agent_template(
        self, 
        template_id: str, 
        user_input: str, 
        context: Dict[str, Any] = None,
        llm_settings: Dict[str, Any] = None
    ) -> AgentExecutionResult:
        """Execute an agent based on its template"""
        
        template = agent_template_service.get_template(template_id)
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        start_time = datetime.now()
        
        # Build context string
        context_parts = []
        if context:
            if context.get('conversation_history'):
                context_parts.append("CONVERSATION HISTORY:")
                for hist in context['conversation_history'][-5:]:
                    context_parts.append(f"- {hist}")
                context_parts.append("")
            
            if context.get('current_prototype'):
                context_parts.append("CURRENT PROTOTYPE STATE:")
                context_parts.append(json.dumps(context['current_prototype'], indent=2))
                context_parts.append("")
            
            if context.get('session_preferences'):
                context_parts.append("USER PREFERENCES:")
                context_parts.append(context['session_preferences'])
                context_parts.append("")
            
            if context.get('dependency_results'):
                dependency_count = len(context['dependency_results'])
                print(f"[CONTEXT] Including {dependency_count} previous agent results for context")
                context_parts.append("PREVIOUS AGENT ANALYSES:")
                for i, result in enumerate(context['dependency_results']):
                    agent_name = result.get('agent_name', 'Unknown Agent')
                    print(f"[CONTEXT] Adding result #{i+1}: {agent_name}")
                    context_parts.append(f"\n=== {agent_name} ===")
                    context_parts.append(result.get('content', ''))
                    if result.get('suggestions'):
                        context_parts.append("\nKey Suggestions:")
                        for suggestion in result['suggestions'][:3]:  # Limit to top 3
                            context_parts.append(f"- {suggestion}")
                context_parts.append("")
        
        context_str = "\n".join(context_parts)
        
        # Prepare the full prompt
        full_prompt = f"""{template.prompt}

CONTEXT:
{context_str}

USER REQUEST:
{user_input}

Please provide your analysis and recommendations based on your role as {template.name}."""
        
        # Handle special agent types with custom logic
        if template.type == AgentTemplateType.RERUN:
            return await self._execute_rerun_agent(template, user_input, context_str)
        elif template.type == AgentTemplateType.QUESTIONS:
            return await self._execute_questions_agent(template, user_input, context_str)
        else:
            return await self._execute_standard_agent(template, full_prompt, start_time, llm_settings)
    
    async def _execute_standard_agent(
        self, 
        template: AgentTemplate, 
        full_prompt: str, 
        start_time: datetime,
        llm_settings: Dict[str, Any] = None
    ) -> AgentExecutionResult:
        """Execute a standard agent template"""
        
        # Extract LLM settings or use defaults
        model = "gpt-4o-mini"
        temperature = 0.7
        if llm_settings:
            model = llm_settings.get('model', model)
            temperature = llm_settings.get('temperature', temperature)
        
        print(f"[LLM] Using model: {model}, temperature: {temperature}")
        
        # Debug provider detection
        provider = self.llm_manager.get_provider_for_model(model)
        print(f"[LLM] Auto-detected provider for {model}: {provider}")
        
        try:
            # Use LLM manager to automatically route to correct provider
            messages = [
                LLMMessage(role="system", content=template.prompt),
                LLMMessage(role="user", content=full_prompt)
            ]
            
            print(f"[LLM] Calling LLM manager generate with provider: {provider}")
            response = await self.llm_manager.generate(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=1500
            )
            print(f"[LLM] Received response: {len(response.content)} characters")
            
            content = response.content
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Parse suggestions and critique from content
            suggestions = self._extract_suggestions(content)
            critique = self._extract_critique(content, template.type)
            confidence = self._calculate_confidence(content)
            
            # Handle special agent types
            competitor_analysis = None
            if template.type == AgentTemplateType.COMPANY_COMPETITOR:
                competitor_analysis = self._extract_competitor_analysis(content)
            
            alternative_ideas = []
            if template.type == AgentTemplateType.COACH:
                alternative_ideas = self._extract_alternative_ideas(content)
            
            return AgentExecutionResult(
                template_id=template.id,
                agent_name=template.name,
                content=content,
                suggestions=suggestions,
                critique=critique,
                confidence_level=confidence,
                execution_time=execution_time,
                alternative_ideas=alternative_ideas,
                competitor_analysis=competitor_analysis
            )
            
        except Exception as e:
            return AgentExecutionResult(
                template_id=template.id,
                agent_name=template.name,
                content=f"Error executing agent: {str(e)}",
                confidence_level=0.0,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _execute_rerun_agent(
        self, 
        template: AgentTemplate, 
        user_input: str, 
        context_str: str
    ) -> AgentExecutionResult:
        """Execute the rerun agent that provides 5 different analyses"""
        
        start_time = datetime.now()
        rerun_results = []
        
        base_prompt = f"""{template.prompt}

CONTEXT:
{context_str}

USER REQUEST:
{user_input}"""
        
        # Run 5 different analyses in parallel
        tasks = []
        for i in range(5):
            variation_prompt = f"""{base_prompt}

This is variation #{i+1}. Provide a unique perspective focusing on different aspects or approaches than the other variations."""
            
            task = self._get_single_response(variation_prompt, temperature=0.8 + (i * 0.1))
            tasks.append(task)
        
        try:
            responses = await asyncio.gather(*tasks)
            rerun_results = [f"Analysis #{i+1}:\n{resp}" for i, resp in enumerate(responses)]
            
            # Combine all results
            combined_content = "\n\n" + "="*50 + "\n\n".join(rerun_results)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return AgentExecutionResult(
                template_id=template.id,
                agent_name=template.name,
                content=combined_content,
                rerun_results=rerun_results,
                confidence_level=0.9,  # High confidence in multiple perspectives
                execution_time=execution_time
            )
            
        except Exception as e:
            return AgentExecutionResult(
                template_id=template.id,
                agent_name=template.name,
                content=f"Error executing rerun agent: {str(e)}",
                confidence_level=0.0,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _execute_questions_agent(
        self, 
        template: AgentTemplate, 
        user_input: str, 
        context_str: str
    ) -> AgentExecutionResult:
        """Execute the questions agent that generates 10 strategic questions"""
        
        start_time = datetime.now()
        
        full_prompt = f"""{template.prompt}

CONTEXT:
{context_str}

USER REQUEST:
{user_input}

Generate exactly 10 strategic questions that would help better understand and improve this request."""
        
        try:
            messages = [
                LLMMessage(role="system", content=template.prompt),
                LLMMessage(role="user", content=full_prompt)
            ]
            
            response = await self.llm_manager.generate(
                messages=messages,
                model="gpt-4o-mini",
                temperature=0.6,
                max_tokens=1000
            )
            
            content = response.content
            questions = self._extract_questions(content)
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return AgentExecutionResult(
                template_id=template.id,
                agent_name=template.name,
                content=content,
                questions=questions,
                confidence_level=0.85,
                execution_time=execution_time
            )
            
        except Exception as e:
            return AgentExecutionResult(
                template_id=template.id,
                agent_name=template.name,
                content=f"Error executing questions agent: {str(e)}",
                confidence_level=0.0,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _get_single_response(self, prompt: str, temperature: float = 0.7) -> str:
        """Get a single response from the AI"""
        try:
            messages = [LLMMessage(role="user", content=prompt)]
            
            response = await self.llm_manager.generate(
                messages=messages,
                model="gpt-4o-mini",
                temperature=temperature,
                max_tokens=800
            )
            return response.content
        except Exception as e:
            return f"Error getting response: {str(e)}"
    
    def _extract_suggestions(self, content: str) -> List[str]:
        """Extract suggestions from agent response"""
        suggestions = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['suggest', 'recommend', 'should', 'could', 'consider']):
                if len(line) > 20:  # Only meaningful suggestions
                    suggestions.append(line)
        
        return suggestions[:5]  # Limit to 5 suggestions
    
    def _extract_critique(self, content: str, agent_type: AgentTemplateType) -> str:
        """Extract critique from agent response"""
        if agent_type == AgentTemplateType.CRITIQUE:
            # For critique agent, the whole response is essentially critique
            lines = content.split('\n')
            critique_lines = [line for line in lines if 
                            any(word in line.lower() for word in ['concern', 'issue', 'problem', 'risk', 'challenge'])]
            return '\n'.join(critique_lines[:3])
        return None
    
    def _extract_competitor_analysis(self, content: str) -> str:
        """Extract competitor analysis from response"""
        lines = content.split('\n')
        analysis_lines = [line for line in lines if 
                         any(word in line.lower() for word in ['competitor', 'market', 'advantage', 'differentiat'])]
        return '\n'.join(analysis_lines[:5])
    
    def _extract_alternative_ideas(self, content: str) -> List[str]:
        """Extract alternative ideas from coach agent response"""
        ideas = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['alternative', 'instead', 'option', 'idea', 'approach']):
                if len(line) > 20:
                    ideas.append(line)
        
        return ideas[:5]
    
    def _extract_questions(self, content: str) -> List[str]:
        """Extract questions from response"""
        questions = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if '?' in line and len(line) > 10:
                # Clean up the question
                question = line.split('?')[0] + '?'
                questions.append(question)
        
        return questions[:10]  # Limit to 10 questions
    
    def _calculate_confidence(self, content: str) -> float:
        """Calculate confidence level based on content analysis"""
        # Simple heuristic: longer, more detailed responses get higher confidence
        word_count = len(content.split())
        
        if word_count > 300:
            return 0.9
        elif word_count > 200:
            return 0.8
        elif word_count > 100:
            return 0.7
        else:
            return 0.6
    
    async def execute_multiple_templates(
        self, 
        template_ids: List[str], 
        user_input: str, 
        context: Dict[str, Any] = None,
        llm_settings: Dict[str, Any] = None
    ) -> List[AgentExecutionResult]:
        """
        Executes multiple agent templates in an order determined by their dependencies.
        """
        
        # 1. Fetch all template objects to access their `depends_on` fields.
        templates = {tid: agent_template_service.get_template(tid) for tid in template_ids}
        for tid, template in templates.items():
            if not template:
                raise ValueError(f"Template not found: {tid}")

        # 2. Build the dependency graph.
        graph = {tid: set() for tid in template_ids}
        in_degree = {tid: 0 for tid in template_ids}

        for tid, template in templates.items():
            # Ensure depends_on exists and is a list before iterating
            dependencies = getattr(template, 'depends_on', []) or []
            for dep_id in dependencies:
                if dep_id in templates: # Only consider dependencies that are part of the current selection
                    graph[dep_id].add(tid)
                    in_degree[tid] += 1

        # 3. Perform a topological sort (Kahn's algorithm) to find execution stages.
        queue = [tid for tid in template_ids if in_degree[tid] == 0]
        execution_stages = []
        
        while queue:
            execution_stages.append(queue)
            next_queue = []
            for u in queue:
                for v in sorted(list(graph[u])): # sorted for deterministic order
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        next_queue.append(v)
            queue = next_queue

        # Check for cycles (if not all templates were included in the sort)
        if sum(len(stage) for stage in execution_stages) != len(template_ids):
            raise ValueError("A circular dependency was detected among the selected agents.")

        # 4. Execute the stages sequentially.
        executed_results: Dict[str, AgentExecutionResult] = {}
        
        for stage in execution_stages:
            tasks = []
            for template_id in stage:
                template = templates[template_id]
                
                # Create a new context for this execution
                execution_context = context.copy() if context else {}
                
                # Gather results from dependencies and add them to the context
                dependency_outputs = []
                # Ensure depends_on exists and is a list before iterating
                dependencies = getattr(template, 'depends_on', []) or []
                for dep_id in dependencies:
                    if dep_id in executed_results:
                        dependency_outputs.append(executed_results[dep_id].dict())
                
                if dependency_outputs:
                    execution_context['dependency_results'] = dependency_outputs

                task = self.execute_agent_template(template_id, user_input, execution_context, llm_settings)
                tasks.append(task)
            
            # Run the current stage in parallel
            stage_results: List[AgentExecutionResult] = await asyncio.gather(*tasks)
            
            # Store results
            for result in stage_results:
                executed_results[result.template_id] = result

        # 5. Return the results in the original requested order.
        return [executed_results[tid] for tid in template_ids if tid in executed_results]

# Global instance
template_agent_executor = TemplateAgentExecutor()