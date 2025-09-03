"""
Epic-Stories Pipeline Service - Background processing for development plans
"""

import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from ..services.template_agent_executor import template_agent_executor
from ..models.agent_models import AgentExecutionResult


class EpicStoriesPipeline:
    """Manages the Epic → Stories generation pipeline with file output"""
    
    def __init__(self):
        # Create output directory
        self.output_dir = Path(__file__).parent.parent.parent / "data" / "development_plans"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Track active pipelines
        self.active_pipelines: Dict[str, Dict[str, Any]] = {}
    
    async def start_pipeline(
        self, 
        session_id: str, 
        user_input: str, 
        context: Dict[str, Any],
        llm_settings: Dict[str, Any]
    ) -> str:
        """Start the Epic-Stories pipeline and return pipeline ID"""
        
        pipeline_id = f"pipeline_{session_id}_{int(datetime.now().timestamp())}"
        
        # Initialize pipeline tracking
        self.active_pipelines[pipeline_id] = {
            "status": "starting",
            "session_id": session_id,
            "user_input": user_input,
            "context": context,
            "llm_settings": llm_settings,
            "created_at": datetime.now(),
            "epics_file": None,
            "stories_files": [],
            "final_file": None,
            "progress": {
                "epics": "pending",
                "stories": "pending", 
                "merge": "pending"
            }
        }
        
        # Start the pipeline in the background
        asyncio.create_task(self._run_pipeline(pipeline_id))
        
        return pipeline_id
    
    async def _run_pipeline(self, pipeline_id: str):
        """Execute the complete Epic-Stories pipeline"""
        
        try:
            pipeline = self.active_pipelines[pipeline_id]
            
            # Step 1: Generate Epics
            print(f"[PIPELINE] {pipeline_id} - Starting Epic generation...")
            pipeline["status"] = "generating_epics"
            pipeline["progress"]["epics"] = "running"
            
            epics_result = await self._generate_epics(
                pipeline["user_input"],
                pipeline["context"], 
                pipeline["llm_settings"]
            )
            
            if not epics_result:
                raise Exception("Failed to generate epics")
            
            # Save epics to file
            epics_file = self.output_dir / f"{pipeline_id}_epics.json"
            await self._save_epics(epics_file, epics_result)
            pipeline["epics_file"] = str(epics_file)
            pipeline["progress"]["epics"] = "completed"
            
            print(f"[PIPELINE] {pipeline_id} - Epics saved to {epics_file}")
            
            # Step 2: Extract epics and generate stories in parallel
            epics = await self._extract_epics_from_result(epics_result)
            if not epics:
                raise Exception("No epics found in result")
            
            print(f"[PIPELINE] {pipeline_id} - Starting parallel story generation for {len(epics)} epics...")
            pipeline["status"] = "generating_stories" 
            pipeline["progress"]["stories"] = "running"
            
            story_tasks = []
            for i, epic in enumerate(epics):
                task = self._generate_stories_for_epic(
                    epic, i+1, pipeline["user_input"], 
                    pipeline["context"], pipeline["llm_settings"], pipeline_id
                )
                story_tasks.append(task)
            
            # Run all story generation in parallel
            story_files = await asyncio.gather(*story_tasks)
            pipeline["stories_files"] = [f for f in story_files if f]
            pipeline["progress"]["stories"] = "completed"
            
            print(f"[PIPELINE] {pipeline_id} - Generated {len(story_files)} story files")
            
            # Step 3: Merge everything into final development plan
            print(f"[PIPELINE] {pipeline_id} - Merging final development plan...")
            pipeline["status"] = "merging"
            pipeline["progress"]["merge"] = "running"
            
            final_file = await self._merge_development_plan(
                pipeline_id, epics_result, pipeline["stories_files"]
            )
            
            pipeline["final_file"] = str(final_file)
            pipeline["progress"]["merge"] = "completed"
            pipeline["status"] = "completed"
            pipeline["completed_at"] = datetime.now()
            
            print(f"[PIPELINE] {pipeline_id} - Development plan ready: {final_file}")
            
        except Exception as e:
            print(f"[PIPELINE] {pipeline_id} - ERROR: {e}")
            self.active_pipelines[pipeline_id]["status"] = "failed"
            self.active_pipelines[pipeline_id]["error"] = str(e)
    
    async def _generate_epics(self, user_input: str, context: Dict, llm_settings: Dict) -> Optional[AgentExecutionResult]:
        """Generate epics using the Epic Generator"""
        try:
            result = await template_agent_executor.execute_agent_template(
                "epics_generator_default",
                user_input,
                context,
                llm_settings
            )
            return result
        except Exception as e:
            print(f"[EPIC_GEN] Error: {e}")
            return None
    
    async def _save_epics(self, file_path: Path, epics_result: AgentExecutionResult):
        """Save epics result to JSON file"""
        data = {
            "agent_name": epics_result.agent_name,
            "content": epics_result.content,
            "execution_time": epics_result.execution_time,
            "confidence_level": epics_result.confidence_level,
            "created_at": datetime.now().isoformat()
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    async def _extract_epics_from_result(self, epics_result: AgentExecutionResult) -> List[Dict[str, str]]:
        """Extract individual epics from the Epic Generator result"""
        content = epics_result.content
        epics = []
        
        # Simple parsing - look for "EPIC" headers
        lines = content.split('\n')
        current_epic = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('**EPIC') or line.startswith('EPIC'):
                # Save previous epic
                if current_epic:
                    epics.append({
                        "title": current_epic,
                        "content": '\n'.join(current_content).strip()
                    })
                
                # Start new epic
                current_epic = line.replace('**', '').replace('EPIC', '').replace(':', '').strip()
                current_content = []
            else:
                if current_epic and line:
                    current_content.append(line)
        
        # Save last epic
        if current_epic:
            epics.append({
                "title": current_epic,
                "content": '\n'.join(current_content).strip()
            })
        
        print(f"[EPIC_PARSE] Extracted {len(epics)} epics")
        return epics
    
    async def _generate_stories_for_epic(
        self, epic: Dict[str, str], epic_number: int, 
        user_input: str, context: Dict, llm_settings: Dict, pipeline_id: str
    ) -> Optional[str]:
        """Generate stories for a specific epic"""
        try:
            # Create epic-specific context
            epic_context = context.copy()
            epic_context['current_epic'] = epic
            epic_context['epic_number'] = epic_number
            
            # Create focused prompt for this epic
            epic_prompt = f"""Based on the following epic, generate detailed user stories:

EPIC {epic_number}: {epic['title']}
{epic['content']}

Original user request: {user_input}

Generate 3-4 user stories for this epic. Each story should have:
- Story title
- User story format: "As a [user], I want [goal] so that [benefit]"
- Acceptance criteria
- Priority and effort estimate"""
            
            result = await template_agent_executor.execute_agent_template(
                "stories_generator_default",
                epic_prompt,
                epic_context,
                llm_settings
            )
            
            if result:
                # Save stories to individual file
                stories_file = self.output_dir / f"{pipeline_id}_stories_epic_{epic_number}.json"
                story_data = {
                    "epic_number": epic_number,
                    "epic_title": epic['title'],
                    "stories_content": result.content,
                    "execution_time": result.execution_time,
                    "created_at": datetime.now().isoformat()
                }
                
                with open(stories_file, 'w', encoding='utf-8') as f:
                    json.dump(story_data, f, indent=2, ensure_ascii=False)
                
                print(f"[STORIES] Epic {epic_number} stories saved to {stories_file}")
                return str(stories_file)
            
            return None
            
        except Exception as e:
            print(f"[STORIES] Epic {epic_number} error: {e}")
            return None
    
    async def _merge_development_plan(
        self, pipeline_id: str, epics_result: AgentExecutionResult, story_files: List[str]
    ) -> Path:
        """Merge epics and stories into final development plan"""
        
        final_file = self.output_dir / f"{pipeline_id}_development_plan.md"
        
        # Read all story files
        stories_data = {}
        for story_file in story_files:
            if story_file:
                try:
                    with open(story_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        stories_data[data['epic_number']] = data
                except Exception as e:
                    print(f"[MERGE] Error reading {story_file}: {e}")
        
        # Create comprehensive markdown development plan
        markdown_content = f"""# Development Plan
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary
This development plan was generated from multi-agent analysis and includes comprehensive epics with detailed user stories.

## Epics Overview

{epics_result.content}

## Detailed Epic-Story Breakdown

"""
        
        # Add each epic with its stories
        for epic_num in sorted(stories_data.keys()):
            story_data = stories_data[epic_num]
            markdown_content += f"""
### Epic {epic_num}: {story_data['epic_title']}

#### User Stories:
{story_data['stories_content']}

---

"""
        
        markdown_content += f"""
## Development Summary
- **Total Epics**: {len(stories_data)}
- **Pipeline ID**: {pipeline_id}
- **Generation Time**: {epics_result.execution_time + sum(float(s.get('execution_time', 0)) for s in stories_data.values()):.2f} seconds
- **Confidence Level**: {epics_result.confidence_level}

## Next Steps
1. Review and prioritize epics
2. Break down stories into technical tasks
3. Estimate effort and create sprint plan
4. Begin implementation

---
*Generated by AI Multi-Agent Development Planner*
"""
        
        # Save final markdown file
        with open(final_file, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"[MERGE] Final development plan saved to {final_file}")
        return final_file
    
    def get_pipeline_status(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a pipeline"""
        return self.active_pipelines.get(pipeline_id)
    
    def get_download_file(self, pipeline_id: str) -> Optional[str]:
        """Get the final file path for download"""
        pipeline = self.active_pipelines.get(pipeline_id)
        if pipeline and pipeline.get("status") == "completed":
            return pipeline.get("final_file")
        return None


# Global pipeline instance
epic_stories_pipeline = EpicStoriesPipeline()