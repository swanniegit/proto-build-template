import openai
import json
import os
from typing import List, Dict, Any, Optional

from ..core.config import OPENAI_API_KEY
from ..models.agent_models import AgentType, AgentResponse

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'prompts')

class DesignAgent:
    def __init__(self, agent_type: AgentType, model: str = "gpt-5"):
        self.agent_type = agent_type
        self.model = model
        self.instructions = self._get_instructions()
    
    def _get_instructions(self) -> str:
        # Instructions are hardcoded in server_backup.py, but we'll keep them externalized
        # and read from the prompt files as we did before.
        prompt_file = os.path.join(PROMPTS_DIR, f"{self.agent_type.value}.txt")
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            print(f"Warning: Prompt file not found for {self.agent_type.value}. Using default.")
            return "You are a helpful assistant."
    
    async def process(self, user_input: str, current_prototype: Dict[str, Any], context: str) -> AgentResponse:
        """Process user input and current prototype through this agent's lens"""
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            prompt = f"""
AGENT ROLE: {self.instructions}

CURRENT PROTOTYPE:
{json.dumps(current_prototype, indent=2) if current_prototype else "No prototype yet"}

CONTEXT:
{context}

USER REQUEST:
{user_input}

TASK: Analyze the user request and current prototype from your specialized perspective. 

Respond with JSON in this exact format:
{{
  "agent_type": "{self.agent_type.value}",
  "content": "Your expert commentary on the request/prototype",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "critique": "Your critique of current design (or null if not applicable)",
  "handoff_to": null,
  "prototype_update": {{}} 
}}

IMPORTANT: 
- Use null for critique if no critique applies
- Use null for handoff_to (don't handoff in tests)
- Provide 3-5 specific suggestions as strings in the suggestions array."""

            try:
                # Try GPT-5 Responses API first
                response = client.responses.create(
                    model=self.model,
                    instructions=f"You are a {self.agent_type.value} providing expert analysis. Return valid JSON only.",
                    input=prompt,
                    text={"format": {"type": "json_schema", "json_schema": {"schema": AgentResponse.model_json_schema(), "strict": True}}},
                    temperature=0.3
                )
                result = json.loads(response.output_text)
            except Exception as responses_error:
                print(f"Responses API failed, falling back to Chat Completions: {responses_error}")
                # Fallback to Chat Completions API
                response = client.chat.completions.create(
                    model="gpt-4o-2024-08-06",
                    messages=[
                        {"role": "system", "content": f"You are a {self.agent_type.value} providing expert analysis. Return valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                
                content = response.choices[0].message.content
                # Clean up response
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                
                result = json.loads(content.strip())
            
            return AgentResponse(**result)
            
        except Exception as e:
            print(f"Agent {self.agent_type} processing failed: {e}")
            return AgentResponse(
                agent_type=self.agent_type,
                content=f"Error in {self.agent_type.value} analysis: {str(e)}",
                suggestions=["Please try rephrasing your request"],
                critique="Unable to analyze due to processing error"
            )
    
    async def process_enhanced(self, user_input: str, enriched_context: str, assignment: Any) -> AgentResponse:
        """Enhanced processing method for multi-agent workflows"""
        # Extract current prototype from context if available, otherwise use empty dict
        current_prototype = {}
        
        # Try to extract prototype from enriched context
        if "CURRENT PROTOTYPE STATE:" in enriched_context:
            try:
                prototype_section = enriched_context.split("CURRENT PROTOTYPE STATE:")[1].split("\n\n")[0]
                current_prototype = json.loads(prototype_section.strip())
            except (json.JSONDecodeError, IndexError):
                current_prototype = {}
        
        return await self.process(user_input, current_prototype, enriched_context)
    
    async def direct_chat(self, user_message: str, context_str: str) -> str:
        """Direct chat method for agent communication"""
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            prompt = f"""
AGENT ROLE: {self.instructions}

CONTEXT:
{context_str}

USER MESSAGE:
{user_message}

TASK: Respond to the user's message directly from your specialized perspective as a {self.agent_type.value.replace('_', ' ').title()}. 
Provide helpful, specific advice based on your expertise.

Respond naturally and conversationally."""

            response = client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                messages=[
                    {"role": "system", "content": f"You are a {self.agent_type.value.replace('_', ' ').title()} assistant. Be helpful and specific."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Agent {self.agent_type} direct chat failed: {e}")
            return f"Sorry, I encountered an error: {str(e)}"


class StoriesAndQAAgent:
    """Agent for Stories & QA Planning workflows"""
    
    def __init__(self, agent_type: AgentType, model: str = "gpt-5"):
        self.agent_type = agent_type
        self.model = model
        self.instructions = self._get_instructions()
    
    def _get_instructions(self) -> str:
        """Get instructions for Stories & QA agents"""
        prompt_file = os.path.join(PROMPTS_DIR, f"{self.agent_type.value}.txt")
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            print(f"Warning: Prompt file not found for {self.agent_type.value}. Using default.")
            return f"You are a {self.agent_type.value.replace('_', ' ').title()} agent specializing in agile development planning."
    
    async def process_request(self, user_input: str, context: str, prd_content: str) -> Dict[str, Any]:
        """Process Stories & QA requests"""
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            prompt = f"""
AGENT ROLE: {self.instructions}

PRD CONTENT:
{prd_content}

CONTEXT:
{context}

USER REQUEST:
{user_input}

TASK: Based on your role as a {self.agent_type.value.replace('_', ' ').title()}, analyze the request and provide:
1. Specific deliverables based on your specialization
2. Actionable recommendations
3. Any concerns or dependencies
4. Next steps

Respond as a helpful analysis from your perspective."""

            response = client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                messages=[
                    {"role": "system", "content": f"You are a {self.agent_type.value.replace('_', ' ').title()} providing expert analysis."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            content = response.choices[0].message.content
            
            # Parse structured data based on agent type
            result = {
                "agent_type": self.agent_type.value,
                "content": content,
                "suggestions": ["Review the analysis", "Implement recommendations", "Consider dependencies"],
                "deliverables": []
            }
            
            # Add structured fields based on agent type
            if self.agent_type == AgentType.EPIC_GENERATOR:
                epics = self._extract_epics_from_content(content)
                # Only add epics if we actually found some, otherwise show raw content
                if epics:
                    result["epics"] = epics
                    print(f"[EPIC-DEBUG] Extracted {len(epics)} epics from content")
                    print(f"[EPIC-DEBUG] First epic title: {epics[0].get('title', 'No title')}")
                else:
                    print(f"[EPIC-DEBUG] No epics extracted - showing raw AI response")
                    print(f"[EPIC-DEBUG] First 500 chars: {content[:500]}")
            elif self.agent_type == AgentType.STORY_GENERATOR:
                result["stories"] = self._extract_stories_from_content(content)
            elif self.agent_type == AgentType.QA_PLANNER:
                result["qa_plans"] = self._extract_qa_plans_from_content(content)
            
            return result
            
        except Exception as e:
            print(f"StoriesAndQA Agent {self.agent_type} processing failed: {e}")
            return {
                "agent_type": self.agent_type.value,
                "content": f"Error in {self.agent_type.value} analysis: {str(e)}",
                "suggestions": ["Please try rephrasing your request"],
                "deliverables": []
            }
    
    def _extract_epics_from_content(self, content: str) -> List[Dict[str, Any]]:
        """Extract epics from agent content"""
        import re
        import uuid
        from datetime import datetime
        
        epics = []
        
        # Simple numbered pattern matching
        lines = content.split('\n')
        current_epic = None
        
        for line in lines:
            line = line.strip()
            
            # Look for Epic patterns: "1. **Epic 1: Motor Insurance..." or "**Epic 1: Motor..."
            epic_match = re.match(r'(?:\d+\.\s*)?\*\*Epic\s*(\d+):\s*([^*]+)\*\*', line)
            if epic_match:
                # Save previous epic if exists
                if current_epic:
                    # Fill in required fields with defaults if not set
                    if "acceptance_criteria" not in current_epic:
                        current_epic["acceptance_criteria"] = ["Epic completion criteria to be defined"]
                    if "business_value" not in current_epic:
                        current_epic["business_value"] = "Business value to be quantified"
                    current_epic.update({
                        "id": str(uuid.uuid4()),
                        "dependencies": [],
                        "complexity": "medium",
                        "priority": int(epic_match.group(1)) if epic_match else 1,
                        "agent_type": "epic_generator",
                        "timestamp": datetime.now().isoformat()
                    })
                    epics.append(current_epic)
                
                epic_num = epic_match.group(1)
                title = epic_match.group(2).strip()
                current_epic = {
                    "title": f"Epic {epic_num}: {title}",
                    "description": ""
                }
            
            # Look for objective
            elif current_epic and ('**Objective:**' in line or '- **Objective:**' in line):
                objective = line.replace('**Objective:**', '').replace('- **Objective:**', '').strip()
                current_epic["description"] = objective
            
            # Look for success criteria  
            elif current_epic and ('**Success Criteria:**' in line):
                criteria = line.replace('**Success Criteria:**', '').strip()
                if criteria:
                    current_epic["acceptance_criteria"] = [criteria]
            
            # Look for business value
            elif current_epic and ('**Business Value:**' in line or '**Value:**' in line):
                value = line.replace('**Business Value:**', '').replace('**Value:**', '').strip()
                if value:
                    current_epic["business_value"] = value
        
        # Add the last epic with required fields
        if current_epic:
            if "acceptance_criteria" not in current_epic:
                current_epic["acceptance_criteria"] = ["Epic completion criteria to be defined"]
            if "business_value" not in current_epic:
                current_epic["business_value"] = "Business value to be quantified"
            current_epic.update({
                "id": str(uuid.uuid4()),
                "dependencies": [],
                "complexity": "medium",
                "priority": len(epics) + 1,
                "agent_type": "epic_generator",
                "timestamp": datetime.now().isoformat()
            })
            epics.append(current_epic)
        
        return epics[:5]  # Limit to 5 epics
    
    def _extract_stories_from_content(self, content: str) -> List[Dict[str, Any]]:
        """Extract user stories from agent content"""
        import uuid
        from datetime import datetime
        
        stories = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if 'As a' in line or 'User Story' in line:
                stories.append({
                    "id": str(uuid.uuid4()),
                    "epic_id": f"epic-{(i % 3) + 1}",  # Distribute across epics
                    "title": line.replace('User Story:', '').replace('**', '').strip(),
                    "user_story": line,
                    "acceptance_criteria": ["Story completion criteria to be defined"],
                    "definition_of_done": ["Code complete", "Tests pass", "Documentation updated"],
                    "story_points": 3,
                    "dependencies": [],
                    "agent_type": "story_generator",
                    "timestamp": datetime.now().isoformat()
                })
        
        return stories[:10]  # Limit to 10 stories
    
    def _extract_qa_plans_from_content(self, content: str) -> List[Dict[str, Any]]:
        """Extract QA plans from agent content"""
        import uuid
        from datetime import datetime
        import re
        
        test_scenarios = []
        edge_cases = []
        compliance_tests = []
        performance_criteria = []
        security_considerations = []
        
        # Split content into lines and process
        lines = content.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect section headers and categorize following content
            line_lower = line.lower()
            
            # Detect section headers
            if any(marker in line for marker in ['🧪', '**Test', '1.', '2.', '3.', '4.', '5.']):
                if any(keyword in line_lower for keyword in ['test plan', 'test case', 'uat', 'user acceptance', 'integration']):
                    current_section = 'test_scenarios'
                elif any(keyword in line_lower for keyword in ['performance', 'load', 'mobile', 'device', 'speed']):
                    current_section = 'performance_criteria'
                elif any(keyword in line_lower for keyword in ['fraud', 'security', 'auth']):
                    current_section = 'security_considerations'
                elif any(keyword in line_lower for keyword in ['compliance', 'regulation', 'fsca', 'legal']):
                    current_section = 'compliance_tests'
                else:
                    current_section = 'test_scenarios'  # Default for numbered items
            
            # Process bullet points and content under sections
            if line.startswith('-') or line.startswith('•') or re.match(r'^\d+\.', line):
                cleaned_line = re.sub(r'^[-•\d\.\s]*', '', line).strip()
                if cleaned_line:
                    if current_section == 'test_scenarios':
                        test_scenarios.append(cleaned_line)
                    elif current_section == 'performance_criteria':
                        performance_criteria.append(cleaned_line)
                    elif current_section == 'security_considerations':
                        security_considerations.append(cleaned_line)
                    elif current_section == 'compliance_tests':
                        compliance_tests.append(cleaned_line)
                    else:
                        test_scenarios.append(cleaned_line)  # Default
            
            # Also check for emoji-marked sections
            elif '⚠️' in line:
                current_section = 'edge_cases'
                edge_cases.append(line.replace('⚠️', '').replace('Edge Cases:', '').strip())
            elif '📋' in line:
                current_section = 'compliance_tests'  
                compliance_tests.append(line.replace('📋', '').replace('Compliance Tests:', '').strip())
            elif '⚡' in line:
                current_section = 'performance_criteria'
                performance_criteria.append(line.replace('⚡', '').replace('Performance Criteria:', '').strip())
            elif '🔒' in line:
                current_section = 'security_considerations'
                security_considerations.append(line.replace('🔒', '').replace('Security Considerations:', '').strip())
            
            # Catch standalone descriptive lines
            elif current_section and len(line) > 20 and not line.startswith('#'):
                if current_section == 'test_scenarios':
                    test_scenarios.append(line)
                elif current_section == 'edge_cases':
                    edge_cases.append(line)
                elif current_section == 'compliance_tests':
                    compliance_tests.append(line)
                elif current_section == 'performance_criteria':
                    performance_criteria.append(line)
                elif current_section == 'security_considerations':
                    security_considerations.append(line)
        
        # If no specific categorized items found, create default comprehensive plan
        if not any([test_scenarios, edge_cases, compliance_tests, performance_criteria, security_considerations]):
            return [{
                "id": str(uuid.uuid4()),
                "story_id": "story-1",
                "test_scenarios": ["Comprehensive functional testing of core features"],
                "edge_cases": ["Boundary condition testing"],
                "compliance_tests": ["Regulatory compliance validation"],
                "performance_criteria": ["System performance benchmarks"],
                "security_considerations": ["Security and access controls"],
                "agent_type": "qa_planner",
                "timestamp": datetime.now().isoformat()
            }]
        
        # Create a single comprehensive QA plan with all extracted items
        qa_plan = {
            "id": str(uuid.uuid4()),
            "story_id": "comprehensive-qa-plan",
            "test_scenarios": test_scenarios if test_scenarios else ["Standard functionality testing"],
            "edge_cases": edge_cases if edge_cases else ["Boundary value testing"],
            "compliance_tests": compliance_tests if compliance_tests else ["Regulatory compliance check"],
            "performance_criteria": performance_criteria if performance_criteria else ["Performance benchmarks"],
            "security_considerations": security_considerations if security_considerations else ["Security validations"],
            "agent_type": "qa_planner",
            "timestamp": datetime.now().isoformat()
        }
        
        return [qa_plan]