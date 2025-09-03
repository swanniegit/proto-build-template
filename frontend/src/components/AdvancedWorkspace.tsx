import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../blocks/providers/AuthProvider';
import { useAgentSelection } from '../blocks/utilities/hooks/useAgentSelection';
import { AgentSelectionPanel } from '../blocks/builders/workspace/AgentSelectionPanel';

interface AgentTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  prompt: string;
  color: string;
  icon: string;
  is_active: boolean;
  is_custom: boolean;
  depends_on?: string[];
}

interface AgentExecutionResult {
  template_id: string;
  agent_name: string;
  content: string;
  suggestions: string[];
  questions: string[];
  critique?: string;
  confidence_level: number;
  execution_time: number;
  alternative_ideas: string[];
  rerun_results: string[];
  competitor_analysis?: string;
}

interface WorkspaceSession {
  id: string;
  name: string;
  input: string;
  results: AgentExecutionResult[];
  timestamp: string;
}

const AdvancedWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [userInput, setUserInput] = useState('');
  const [agentResults, setAgentResults] = useState<AgentExecutionResult[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<AgentTemplate[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentSession, setCurrentSession] = useState<WorkspaceSession | null>(null);
  const [executingAgents, setExecutingAgents] = useState<string[]>([]);
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [showModelSettings, setShowModelSettings] = useState(false);
  
  // LLM Settings
  const [llmSettings, setLlmSettings] = useState({ provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7 });
  
  // Pipeline state
  const [activePipelines, setActivePipelines] = useState<{[key: string]: any}>({});
  const [pipelineStatus, setPipelineStatus] = useState<{[key: string]: string}>({});
  
  // Agent selection state managed by the hook
  const {
    selectedTemplates,
    setSelectedTemplates,
    handleTemplateToggle,
    isSelectable
  } = useAgentSelection(availableTemplates);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Define advanced agents with dynamic activation
  const advancedAgents = [
    // Tier 2: Synthesis & Documentation - Available after ANY agents complete
    {
      id: 'synthesizer_default',
      name: 'Neural Synthesizer',
      icon: '🧠',
      description: 'Fuse all insights',
      tier: 2,
      minAgentsRequired: 1, // Just need at least 1 agent result
      color: 'bg-pink-500/20 text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
    },
    {
      id: 'prd_creator_default', 
      name: 'PRD Architect',
      icon: '📝',
      description: 'Create PRD',
      tier: 2,
      minAgentsRequired: 1, // Just need at least 1 agent result
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
    },
    // Tier 3: Development Planning - Available ONLY after Synthesizer OR PRD has been executed
    {
      id: 'development_planner',
      name: 'Development Planner', 
      icon: '🏗️',
      description: 'Epic-Stories Pipeline with File Export',
      tier: 3,
      requiresTier2: true, // Must have Synthesizer OR PRD result
      isPipeline: true, // Special flag for pipeline mode
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30'
    }
  ];

  // Check if agent is available based on tier requirements
  const isAgentAvailable = (agent: typeof advancedAgents[0]) => {
    // Tier 2: Need at least 1 basic agent result
    if (agent.tier === 2) {
      const available = agentResults.length >= agent.minAgentsRequired;
      console.log(`🎯 Agent ${agent.name} (Tier 2): ${available ? '✅ AVAILABLE' : '❌ BLOCKED'} - Has ${agentResults.length}/${agent.minAgentsRequired} basic results`);
      return available;
    }
    
    // Tier 3: Need Synthesizer OR PRD to have been executed
    if (agent.tier === 3 && agent.requiresTier2) {
      const hasTier2Result = agentResults.some(result => 
        result.template_id === 'synthesizer_default' || result.template_id === 'prd_creator_default'
      );
      console.log(`🎯 Agent ${agent.name} (Tier 3): ${hasTier2Result ? '✅ AVAILABLE' : '❌ BLOCKED'} - ${hasTier2Result ? 'Found Tier 2 result' : 'Needs Synthesizer OR PRD execution'}`);
      return hasTier2Result;
    }
    
    return false;
  };

  // Execute advanced agent or start pipeline
  const executeAdvancedAgent = async (agentId: string) => {
    if (!socket) return;
    
    // Check if this is the Development Planner (pipeline mode)
    const agent = advancedAgents.find(a => a.id === agentId);
    if (agent?.isPipeline) {
      await startDevelopmentPipeline(agentId);
      return;
    }
    
    setExecutingAgents(prev => [...prev, agentId]);
    
    const messageData = {
      type: 'execute_multiple_template_agents',
      data: {
        template_ids: [agentId],
        user_input: userInput,
        llm_settings: llmSettings,
        context: {
          timestamp: new Date().toISOString(),
          llm_provider: llmSettings.provider,
          llm_model: llmSettings.model,
          llm_temperature: llmSettings.temperature,
          // Include results from dependencies as context
          dependency_results: agentResults.map(result => result)
        }
      }
    };

    socket.send(JSON.stringify(messageData));
  };

  // Start Development Pipeline
  const startDevelopmentPipeline = async (agentId: string) => {
    setExecutingAgents(prev => [...prev, agentId]);
    
    try {
      const response = await fetch('/api/development-pipeline/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_input: userInput,
          context: {
            timestamp: new Date().toISOString(),
            llm_provider: llmSettings.provider,
            llm_model: llmSettings.model,
            llm_temperature: llmSettings.temperature,
            dependency_results: agentResults.map(result => result)
          },
          llm_settings: llmSettings
        })
      });

      if (response.ok) {
        const result = await response.json();
        const pipelineId = result.pipeline_id;
        
        setActivePipelines(prev => ({
          ...prev,
          [agentId]: { pipeline_id: pipelineId, status: 'started' }
        }));
        
        setPipelineStatus(prev => ({
          ...prev,
          [pipelineId]: 'started'
        }));
        
        toast.success(`Development pipeline started! Pipeline ID: ${pipelineId}`);
        
        // Start polling for status
        pollPipelineStatus(pipelineId, agentId);
        
      } else {
        throw new Error('Failed to start pipeline');
      }
    } catch (error) {
      console.error('Pipeline start error:', error);
      toast.error('Failed to start development pipeline');
      setExecutingAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  // Poll pipeline status
  const pollPipelineStatus = async (pipelineId: string, agentId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/development-pipeline/status/${pipelineId}`);
        if (response.ok) {
          const status = await response.json();
          
          setPipelineStatus(prev => ({
            ...prev,
            [pipelineId]: status.status
          }));
          
          if (status.status === 'completed') {
            setExecutingAgents(prev => prev.filter(id => id !== agentId));
            setCompletedAgents(prev => [...prev, agentId]);
            
            // Add a synthetic result to show completion with download capability
            const pipelineResult: AgentExecutionResult = {
              template_id: agentId,
              agent_name: 'Development Planner',
              content: `✅ Development Plan Generated!\n\n**Pipeline ID:** ${pipelineId}\n\n**Progress:**\n- Epics: ${status.progress.epics}\n- Stories: ${status.progress.stories}\n- Merge: ${status.progress.merge}\n\n**File Ready:** ${status.final_file ? 'Yes' : 'No'}\n\nYour comprehensive development plan with epics and user stories has been generated and is ready for download.\n\n**Total Epics Generated:** Multiple epics with detailed analysis\n**Total User Stories:** 3-4 stories per epic with acceptance criteria\n**File Format:** Structured Markdown with complete development roadmap\n\n[DOWNLOAD_BUTTON:${pipelineId}]`,
              suggestions: [],
              questions: [],
              confidence_level: 0.95,
              execution_time: 0,
              alternative_ideas: [],
              rerun_results: []
            };
            
            setAgentResults(prev => [...prev, pipelineResult]);
            
            toast.success('🎉 Development plan completed and ready for download!');
            
          } else if (status.status === 'failed') {
            setExecutingAgents(prev => prev.filter(id => id !== agentId));
            toast.error(`Pipeline failed: ${status.error || 'Unknown error'}`);
            
          } else if (status.status === 'generating_epics') {
            toast.info('📑 Generating epics...');
          } else if (status.status === 'generating_stories') {
            toast.info('📄 Generating user stories...');
          } else if (status.status === 'merging') {
            toast.info('🏗️ Creating final development plan...');
          }
          
          // Continue polling if not finished
          if (status.status !== 'completed' && status.status !== 'failed') {
            setTimeout(poll, 2000); // Poll every 2 seconds
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setTimeout(poll, 5000); // Retry in 5 seconds
      }
    };
    
    poll();
  };

  const loadUserPreferences = async () => {
    try {
      // Use correct storage based on authentication state
      let prefs = null;
      
      if (user) {
        // For logged-in users: prioritize localStorage over user profile (Settings page saves to localStorage)
        const userPrefs = localStorage.getItem('userPreferences');
        if (userPrefs) {
          prefs = JSON.parse(userPrefs);
        } else if (user.preferences) {
          prefs = user.preferences;
        }
      } else {
        // For guest users: check both guest storage and regular storage as fallback
        const guestPrefs = localStorage.getItem('userPreferences_guest');
        const regularPrefs = localStorage.getItem('userPreferences');
        
        if (guestPrefs) {
          prefs = JSON.parse(guestPrefs);
        } else if (regularPrefs) {
          prefs = JSON.parse(regularPrefs);
        }
      }
      
      const prefsToUse = prefs;
      
      if (prefsToUse) {
        // Handle both UserPreferences format and any legacy formats
        const provider = prefsToUse.llmProvider || prefsToUse.default_llm_provider || 'openai';
        const model = prefsToUse.llmModel || prefsToUse.default_llm_model || 'gpt-4o-mini';
        const temperature = typeof prefsToUse.llmTemperature === 'number' ? prefsToUse.llmTemperature : 
                           typeof prefsToUse.default_temperature === 'number' ? prefsToUse.default_temperature : 0.7;
        
        const newSettings = { provider, model, temperature };
        setLlmSettings(newSettings);
      }

      // TODO: If signed in, also try to load from backend API
    } catch (error) {
      console.error('❌ Failed to load user preferences:', error);
    }
  };

  const saveUserPreferences = async (newSettings: typeof llmSettings) => {
    try {
      // Save using correct storage based on authentication state
      // Use the full UserPreferences structure to match Settings page
      const currentPrefs = user ? 
        (localStorage.getItem('userPreferences') ? JSON.parse(localStorage.getItem('userPreferences')!) : {}) :
        (localStorage.getItem('userPreferences_guest') ? JSON.parse(localStorage.getItem('userPreferences_guest')!) : {});
      
      const prefsToSave = {
        ...currentPrefs, // Keep existing preferences
        llmProvider: newSettings.provider,
        llmModel: newSettings.model, 
        llmTemperature: newSettings.temperature,
        lastUpdated: new Date().toISOString()
      };
      
      if (user) {
        // For logged-in users: save to localStorage (Settings page format)
        localStorage.setItem('userPreferences', JSON.stringify(prefsToSave));
      } else {
        // For guest users: save to guest storage
        localStorage.setItem('userPreferences_guest', JSON.stringify(prefsToSave));
      }

      // TODO: If signed in, also save to backend
      // await fetch('/api/user/preferences', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ llmSettings: newSettings })
      // });

      toast.success('Settings saved!', { duration: 2000 });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      toast.error('Failed to save settings');
    }
  };

  useEffect(() => {
    // Load preferences after a small delay to ensure component is ready
    const timer = setTimeout(() => {
      loadUserPreferences();
    }, 100);
    
    initializeWebSocket();
    
    // Listen for localStorage changes (when settings are saved in other tabs/pages)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userPreferences' || e.key === 'userPreferences_guest') {
        console.log('🔄 Settings changed in another tab/page, reloading preferences...');
        loadUserPreferences();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also reload preferences when user comes back to this tab/page
    const handleFocus = () => {
      console.log('🔄 Page focused, checking for updated preferences...');
      loadUserPreferences();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearTimeout(timer);
      if (socket) {
        socket.close();
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
    // Trigger a re-evaluation of advanced agent availability
    console.log('🔄 Agent results updated, checking advanced agent availability...');
  }, [agentResults]);

  // Reload preferences when user authentication state changes
  useEffect(() => {
    if (user !== undefined) { // Don't run on initial undefined state
      console.log('👤 User authentication state changed, reloading preferences...');
      loadUserPreferences();
    }
  }, [user]);

  const initializeWebSocket = () => {
    const wsUrl = `ws://localhost:8000/ws/${sessionId}`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      setSocket(newSocket);
      loadAgentTemplates();
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(initializeWebSocket, 3000);
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const loadAgentTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/agent-templates/');
      const data = await response.json();
      
      // Get advanced agent IDs for filtering
      const advancedAgentIds = advancedAgents.map(agent => agent.id);
      
      // Filter out advanced agents from main selection (they're in secondary navbar)
      const coreTemplates = (data.templates || [])
        .filter((t: AgentTemplate) => t.is_active && !advancedAgentIds.includes(t.id));
      
      setAvailableTemplates(coreTemplates);
      
      // Set initial selection to first 3 core templates
      setSelectedTemplates(coreTemplates.slice(0, 3).map((t: AgentTemplate) => t.id));
    } catch (error) {
      console.error('Failed to load agent templates:', error);
      toast.error('Failed to load agent templates from AI Lab');
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'agent_templates':
        // Filter out advanced agents from main selection
        const advancedAgentIds = advancedAgents.map(agent => agent.id);
        const coreTemplates = data.data.templates.filter(
          (t: AgentTemplate) => !t.is_custom && !advancedAgentIds.includes(t.id)
        );
        setAvailableTemplates(coreTemplates);
        
        // Pre-select the first 3 core templates
        const selectedCoreTemplates = coreTemplates.slice(0, 3).map((t: AgentTemplate) => t.id);
        setSelectedTemplates(selectedCoreTemplates);
        break;
        
      case 'template_agent_result':
        const singleResult = data.data.result;
        console.log(`📥 Single agent result received: ${singleResult.agent_name} (ID: ${singleResult.template_id})`);
        setAgentResults(prev => {
          const updated = [...prev, singleResult];
          console.log(`📊 Total agent results now: ${updated.length}`, updated.map(r => r.template_id));
          return updated;
        });
        setCompletedAgents(prev => [...prev, singleResult.agent_name]);
        setExecutingAgents(prev => {
          const updated = prev.filter(agentId => agentId !== singleResult.template_id);
          // If no more agents executing, stop the overall execution state
          if (updated.length === 0) {
            setIsExecuting(false);
          }
          return updated;
        });
        break;
        
      case 'multiple_template_agents_result':
        const results = data.data.results;
        console.log(`📥 Multiple agent results received:`, results.map((r: any) => `${r.agent_name} (${r.template_id})`));
        setAgentResults(prev => {
          const updated = [...prev, ...results];
          console.log(`📊 Total agent results now: ${updated.length}`, updated.map(r => r.template_id));
          return updated;
        });
        setCompletedAgents(results.map((r: any) => r.agent_name));
        setExecutingAgents(prev => {
          const updated = prev.filter(agentId => 
            !results.some((result: any) => result.template_id === agentId)
          );
          // If no more agents executing, stop the overall execution state
          if (updated.length === 0) {
            setIsExecuting(false);
          }
          return updated;
        });
        break;
        
      case 'error':
        toast.error(data.message);
        setIsExecuting(false);
        break;
    }
  };

  const executeSelectedAgents = async () => {
    if (!userInput.trim() || selectedTemplates.length === 0) {
      toast.error('Please enter a request and select at least one agent');
      return;
    }

    setIsExecuting(true);
    setAgentResults([]);
    setCompletedAgents([]);
    
    // Track executing agents by their IDs (not names)
    setExecutingAgents(selectedTemplates);

    if (socket && socket.readyState === WebSocket.OPEN) {
      const messageData = {
        type: 'execute_multiple_template_agents',
        data: {
          template_ids: selectedTemplates,
          user_input: userInput,
          llm_settings: llmSettings, // Include LLM settings
          context: {
            timestamp: new Date().toISOString(),
            llm_provider: llmSettings.provider,
            llm_model: llmSettings.model,
            llm_temperature: llmSettings.temperature
          }
        }
      };
      console.log('📤 Sending WebSocket message:', messageData);
      console.log('📝 User input length:', userInput.length);
      console.log('🎯 Selected templates:', selectedTemplates);
      
      socket.send(JSON.stringify(messageData));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(`${label} copied to clipboard!`);
    }
  };

  const exportResults = (format: 'json' | 'markdown') => {
    if (agentResults.length === 0) {
      toast.error('No results to export');
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify({
        session_id: sessionId,
        user_input: userInput,
        timestamp: new Date().toISOString(),
        llm_settings: llmSettings,
        selected_agents: selectedTemplates.map(id => {
          const template = availableTemplates.find(t => t.id === id);
          return { id, name: template?.name };
        }),
        results: agentResults
      }, null, 2);
      filename = `neural-analysis-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = `# Neural Analysis Results\n\n**Date:** ${new Date().toLocaleString()}\n**Session:** ${sessionId}\n**Input:** ${userInput}\n\n`;
      content += `## AI Configuration\n- **Provider:** ${llmSettings.provider}\n- **Model:** ${llmSettings.model}\n- **Temperature:** ${llmSettings.temperature}\n\n`;
      content += `## Agent Analysis\n\n`;
      
      agentResults.forEach((result, index) => {
        content += `### ${result.agent_name}\n`;
        content += `**Confidence:** ${(result.confidence_level * 100).toFixed(0)}%\n`;
        content += `**Processing Time:** ${result.execution_time.toFixed(1)}s\n\n`;
        content += `${result.content}\n\n`;
        
        if (result.suggestions.length > 0) {
          content += `**Suggestions:**\n${result.suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
        }
        
        if (result.questions.length > 0) {
          content += `**Questions:**\n${result.questions.map(q => `- ${q}`).join('\n')}\n\n`;
        }
        
        content += '---\n\n';
      });
      
      filename = `neural-analysis-${Date.now()}.md`;
      mimeType = 'text/markdown';
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Results exported as ${format.toUpperCase()}!`);
  };

  const saveSession = () => {
    if (agentResults.length === 0) {
      toast.error('No session data to save');
      return;
    }

    const sessionData = {
      id: sessionId,
      name: `Analysis - ${new Date().toLocaleDateString()}`,
      input: userInput,
      results: agentResults,
      timestamp: new Date().toISOString(),
      llm_settings: llmSettings,
      selected_agents: selectedTemplates
    };

    // Save to localStorage for now (in production, this would save to backend)
    const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
    savedSessions.push(sessionData);
    localStorage.setItem('savedSessions', JSON.stringify(savedSessions));

    toast.success('Session saved successfully!');
  };

  // Download development plan from pipeline
  const downloadDevelopmentPlan = async (pipelineId: string) => {
    try {
      const response = await fetch(`/api/development-pipeline/download/${pipelineId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `development_plan_${pipelineId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Development plan downloaded!');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download development plan');
    }
  };

  const renderAgentResult = (result: AgentExecutionResult, index: number) => {
    const template = availableTemplates.find(t => t.id === result.template_id);
    
    return (
      <div key={index} className="mb-6 p-4 border border-gray-700 rounded-xl shadow-lg bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center mb-3">
          <span className="text-2xl mr-3">{template?.icon || '🤖'}</span>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-white">
              {result.agent_name}
            </h3>
            <div className="flex items-center text-sm text-gray-400 mt-1">
              <span>Confidence: {(result.confidence_level * 100).toFixed(0)}%</span>
              <span className="mx-2">•</span>
              <span>Time: {result.execution_time.toFixed(1)}s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(result.content, 'Response')}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors duration-200 flex items-center gap-1"
              title="Copy response to clipboard"
            >
              📋 Copy
            </button>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
              result.confidence_level >= 0.8 ? 'bg-green-500/20 text-green-300' :
              result.confidence_level >= 0.6 ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {result.confidence_level >= 0.8 ? 'High' :
               result.confidence_level >= 0.6 ? 'Medium' : 'Low'} Confidence
            </div>
          </div>
        </div>

        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {result.content.includes('[DOWNLOAD_BUTTON:') ? (
              <>
                {result.content.split('[DOWNLOAD_BUTTON:')[0]}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const pipelineId = result.content.split('[DOWNLOAD_BUTTON:')[1].split(']')[0];
                      downloadDevelopmentPlan(pipelineId);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-lg hover:from-teal-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                  >
                    <span>📥</span>
                    Download Development Plan
                  </button>
                </div>
              </>
            ) : (
              result.content
            )}
          </div>
        </div>

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-blue-300 mb-2 flex items-center">
              <span className="mr-2">💡</span>Suggestions:
            </h4>
            <ul className="space-y-2">
              {result.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-gray-400 flex items-start">
                  <span className="text-blue-400 mr-2 mt-1">•</span>
                  <span className="flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions */}
        {result.questions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-purple-300 mb-2 flex items-center">
              <span className="mr-2">❓</span>Questions:
            </h4>
            <ul className="space-y-2">
              {result.questions.map((question, idx) => (
                <li key={idx} className="text-sm text-gray-400 flex items-start">
                  <span className="text-purple-400 mr-2 mt-1">•</span>
                  <span className="flex-1">{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alternative Ideas (Coach) */}
        {result.alternative_ideas.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-cyan-300 mb-2 flex items-center">
              <span className="mr-2">🌟</span>Alternative Ideas:
            </h4>
            <ul className="space-y-2">
              {result.alternative_ideas.map((idea, idx) => (
                <li key={idx} className="text-sm text-gray-400 flex items-start">
                  <span className="text-cyan-400 mr-2 mt-1">•</span>
                  <span className="flex-1">{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rerun Results */}
        {result.rerun_results.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-green-300 mb-2 flex items-center">
              <span className="mr-2">🔄</span>Multiple Perspectives:
            </h4>
            <div className="space-y-3">
              {result.rerun_results.map((rerunResult, idx) => (
                <div key={idx} className="p-3 bg-gray-800/50 rounded-lg text-sm border border-gray-700">
                  <div className="whitespace-pre-wrap text-gray-300">{rerunResult}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Analysis */}
        {result.competitor_analysis && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-orange-300 mb-2 flex items-center">
              <span className="mr-2">🏆</span>Competitive Analysis:
            </h4>
            <div className="text-sm text-gray-300 bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
              {result.competitor_analysis}
            </div>
          </div>
        )}

        {/* Critique */}
        {result.critique && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-red-300 mb-2 flex items-center">
              <span className="mr-2">🔍</span>Critical Analysis:
            </h4>
            <div className="text-sm text-gray-300 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
              {result.critique}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20"></div>
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 p-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          NEURAL WORKSPACE
        </h1>
        <p className="text-gray-400 mt-1">Multi-Agent Analysis & Generation System</p>
      </div>

      {/* Secondary Navbar - LLM Settings & Export */}
      <div className="relative z-[100] bg-gray-800/30 backdrop-blur-sm border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* LLM Model Info */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">AI ENGINE:</div>
              <div className="relative">
                <button
                  onClick={() => setShowModelSettings(!showModelSettings)}
                  className="flex items-center space-x-3 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">
                      {llmSettings.provider === 'openai' && '🔴 OpenAI'}
                      {llmSettings.provider === 'deepseek' && '🟦 DeepSeek'}
                      {llmSettings.provider === 'kimi' && '🟣 Kimi'}
                    </span>
                    <span className="text-sm text-gray-300">{llmSettings.model}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-600"></div>
                  <div className="text-xs text-gray-400">
                    Temp: <span className="text-cyan-400 font-medium">{llmSettings.temperature}</span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showModelSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Model Settings Dropdown */}
                {showModelSettings && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-xl p-4 shadow-2xl z-[9999]">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-cyan-400 mb-3">AI MODEL SETTINGS</h3>
                      
                      {/* Provider Selection */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Provider</label>
                        <select
                          value={llmSettings.provider}
                          onChange={(e) => {
                            // Set appropriate default model for the selected provider
                            let defaultModel = 'gpt-4o-mini';
                            if (e.target.value === 'deepseek') {
                              defaultModel = 'deepseek-chat';
                            } else if (e.target.value === 'kimi') {
                              defaultModel = 'moonshot-v1-8k';
                            }
                            const newSettings = { ...llmSettings, provider: e.target.value, model: defaultModel };
                            setLlmSettings(newSettings);
                            saveUserPreferences(newSettings);
                          }}
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="openai">🔴 OpenAI</option>
                          <option value="deepseek">🟦 DeepSeek</option>
                          <option value="kimi">🟣 Kimi</option>
                        </select>
                      </div>

                      {/* Model Selection */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Model</label>
                        <select
                          value={llmSettings.model}
                          onChange={(e) => {
                            const newSettings = { ...llmSettings, model: e.target.value };
                            setLlmSettings(newSettings);
                            saveUserPreferences(newSettings);
                          }}
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          {llmSettings.provider === 'openai' && (
                            <>
                              <option value="gpt-4o">GPT-4o</option>
                              <option value="gpt-4o-mini">GPT-4o Mini</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            </>
                          )}
                          {llmSettings.provider === 'deepseek' && (
                            <>
                              <option value="deepseek-chat">DeepSeek Chat</option>
                              <option value="deepseek-coder">DeepSeek Coder</option>
                            </>
                          )}
                          {llmSettings.provider === 'kimi' && (
                            <option value="moonshot-v1-8k">Moonshot v1 8K</option>
                          )}
                        </select>
                      </div>

                      {/* Temperature Slider */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          Temperature: <span className="text-cyan-400 font-medium">{llmSettings.temperature}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={llmSettings.temperature}
                          onChange={(e) => {
                            const newSettings = { ...llmSettings, temperature: parseFloat(e.target.value) };
                            setLlmSettings(newSettings);
                            saveUserPreferences(newSettings);
                          }}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Focused</span>
                          <span>Creative</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Info */}
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <span>🧠</span>
                <span>Session: {sessionId.slice(-8)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>⚙️</span>
                <span className="text-xs text-green-400">Settings: Auto-saved</span>
              </div>
            </div>
          </div>

          {/* Advanced Agents - Tier 2 & 3 */}
          <div className="flex items-center space-x-3 border-l border-gray-600 pl-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Advanced Agents</div>
            {advancedAgents.map((agent) => {
              const isAvailable = isAgentAvailable(agent);
              const isExecuting = executingAgents.includes(agent.id);
              const hasCompleted = agentResults.some(result => result.template_id === agent.id);
              
              return (
                <button
                  key={agent.id}
                  onClick={() => isAvailable && !isExecuting && executeAdvancedAgent(agent.id)}
                  disabled={!isAvailable || isExecuting}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 border ${
                    hasCompleted
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : isAvailable
                      ? `${agent.color} hover:scale-105`
                      : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border-gray-600/30'
                  }`}
                  title={isAvailable ? 
                    `Execute ${agent.name} - ${agent.description}` : 
                    agent.tier === 2 ? 
                      `Requires at least ${agent.minAgentsRequired} basic agent result${agent.minAgentsRequired > 1 ? 's' : ''} (currently have ${agentResults.length})` :
                    agent.tier === 3 ?
                      `Requires Synthesizer OR PRD Architect to be executed first` :
                    agent.tier === 4 ?
                      `Requires Epics Generator to be executed first` :
                      `Requirements not met`
                  }
                >
                  <span>{agent.icon}</span>
                  <span className="hidden sm:inline">{agent.name}</span>
                  {isExecuting && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  {hasCompleted && <span className="text-green-400">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-3">
            {/* Export Options */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportResults('json')}
                disabled={agentResults.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  agentResults.length > 0
                    ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                }`}
                title="Export results as JSON"
              >
                <span>📄</span>
                <span>JSON</span>
              </button>

              <button
                onClick={() => exportResults('markdown')}
                disabled={agentResults.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  agentResults.length > 0
                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
                }`}
                title="Export results as Markdown"
              >
                <span>📝</span>
                <span>MD</span>
              </button>
            </div>

            {/* Session Actions */}
            <button
              onClick={saveSession}
              disabled={agentResults.length === 0}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                agentResults.length > 0
                  ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30'
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/30'
              }`}
              title="Save current session"
            >
              <span>💾</span>
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Panel - Input and Agent Selection */}
        <div className="bg-gray-900/50 backdrop-blur-xl border-r border-gray-800" style={{ width: '30%' }}>
          <div className="p-6 h-full flex flex-col">
            <div className="space-y-6 flex-1 overflow-y-auto">
              {/* User Input */}
              <div>
                <h3 className="font-bold text-xl text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text mb-4">
                  INPUT COMMAND
                </h3>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Describe what you want to create, analyze, or improve..."
                  className="w-full h-36 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent backdrop-blur-sm"
                />
              </div>

              {/* Agent Selection */}
              <AgentSelectionPanel 
                availableTemplates={availableTemplates}
                selectedTemplates={selectedTemplates}
                isSelectable={isSelectable}
                onTemplateToggle={handleTemplateToggle}
                onPresetSelect={setSelectedTemplates}
              />
            </div>

            {/* Execute Button */}
            <div className="pt-6 border-t border-gray-800">
              <button
                onClick={() => {
                  console.log('🔍 Button click - isExecuting:', isExecuting);
                  console.log('🔍 Selected templates:', selectedTemplates);
                  console.log('🔍 User input:', userInput);
                  console.log('🔍 Available templates:', availableTemplates.length);
                  executeSelectedAgents();
                }}
                disabled={isExecuting || selectedTemplates.length === 0 || !userInput.trim()}
                className={`w-full py-5 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center ${
                  isExecuting || selectedTemplates.length === 0 || !userInput.trim()
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105'
                }`}
              >
                {isExecuting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    NEURAL PROCESSING...
                  </span>
                ) : (
                  <>
                    <span className="mr-3">🚀</span>
                    EXECUTE {selectedTemplates.length} AGENT{selectedTemplates.length !== 1 ? 'S' : ''}
                  </>
                )}
              </button>

              {/* Debug Info */}
              <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-800/30 rounded">
                <div>🔍 Debug: isExecuting={String(isExecuting)}</div>
                <div>🎯 Templates: {selectedTemplates.length} selected</div>
                <div>📝 Input: {userInput.length} chars</div>
                <div>📊 Available: {availableTemplates.length} templates</div>
              </div>

              {/* Selected agents summary */}
              {selectedTemplates.length > 0 && (
                <div className="text-sm text-gray-400 mt-3 text-center">
                  <strong className="text-cyan-400">Selected:</strong> {
                    selectedTemplates.map(id => {
                      const template = availableTemplates.find(t => t.id === id);
                      return template?.name;
                    }).join(', ')
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 bg-gray-900/30 backdrop-blur-xl overflow-y-auto">
          <div className="p-6">
            {agentResults.length === 0 && !isExecuting ? (
              <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-6 animate-pulse">🧠</div>
                  <h3 className="text-2xl font-bold text-gray-400 mb-4">NEURAL AGENTS READY</h3>
                  <p className="text-lg text-gray-500">Select agents and submit a command to begin multi-dimensional analysis</p>
                </div>
              </div>
            ) : (
              <div>
                {/* Agent Execution Simulation */}
                {isExecuting && executingAgents.length > 0 && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-cyan-900/30 rounded-xl border border-cyan-500/30 backdrop-blur-sm">
                    <div className="flex items-center mb-4">
                      <svg className="animate-spin h-6 w-6 mr-3 text-cyan-400" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <h3 className="text-xl font-bold text-cyan-400">NEURAL PROCESSING IN PROGRESS</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {executingAgents.map((agentName, index) => (
                        <div key={index} className="flex items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="w-3 h-3 bg-cyan-400 rounded-full mr-3 animate-pulse"></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{agentName}</div>
                            <div className="text-xs text-gray-400">Analyzing...</div>
                          </div>
                          <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Completed Agents Summary */}
                {completedAgents.length > 0 && !isExecuting && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-900/30 via-emerald-900/30 to-teal-900/30 rounded-xl border border-green-500/30">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">✅</span>
                      <span className="text-green-400 font-medium">
                        Analysis Complete - {completedAgents.length} agent{completedAgents.length !== 1 ? 's' : ''} processed
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    ANALYSIS RESULTS ({agentResults.length})
                  </h2>
                  {isExecuting && (
                    <div className="flex items-center text-cyan-400">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Processing...
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  {agentResults.map((result, index) => renderAgentResult(result, index))}
                </div>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedWorkspace;