import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// Types for template-based agents
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
  created_at?: string;
  updated_at?: string;
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

interface TemplateMultiAgentBuilderProps {}

const TemplateMultiAgentBuilder: React.FC<TemplateMultiAgentBuilderProps> = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [userInput, setUserInput] = useState('');
  const [agentResults, setAgentResults] = useState<AgentExecutionResult[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<AgentTemplate[]>([]);
  const [activeTemplates, setActiveTemplates] = useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeWebSocket();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [agentResults]);

  const initializeWebSocket = () => {
    const wsUrl = `ws://localhost:8000/ws/${sessionId}`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      setSocket(newSocket);
      // Load available templates
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

  const loadAgentTemplates = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'get_agent_templates'
      }));
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'agent_templates':
        setAvailableTemplates(data.data.templates);
        setActiveTemplates(data.data.active_templates);
        // Pre-select the first 5 templates (core agents)
        const coreTemplates = data.data.templates
          .filter((t: AgentTemplate) => !t.is_custom)
          .slice(0, 5)
          .map((t: AgentTemplate) => t.id);
        setSelectedTemplates(coreTemplates);
        break;
        
      case 'template_agent_result':
        const singleResult = data.data.result;
        setAgentResults(prev => [...prev, singleResult]);
        setIsExecuting(false);
        break;
        
      case 'multiple_template_agents_result':
        const results = data.data.results;
        setAgentResults(prev => [...prev, ...results]);
        setIsExecuting(false);
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

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'execute_multiple_template_agents',
        data: {
          template_ids: selectedTemplates,
          user_input: userInput,
          context: {
            timestamp: new Date().toISOString()
          }
        }
      }));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const renderAgentResult = (result: AgentExecutionResult, index: number) => {
    const template = availableTemplates.find(t => t.id === result.template_id);
    
    return (
      <div key={index} className="mb-6 p-4 border rounded-lg shadow-sm bg-white">
        <div className="flex items-center mb-3">
          <span className="text-2xl mr-2">{template?.icon || '🤖'}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{color: template?.color}}>
              {result.agent_name}
            </h3>
            <div className="flex items-center text-sm text-gray-600">
              <span>Confidence: {(result.confidence_level * 100).toFixed(0)}%</span>
              <span className="mx-2">•</span>
              <span>Time: {result.execution_time.toFixed(1)}s</span>
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-semibold ${
            result.confidence_level >= 0.8 ? 'bg-green-100 text-green-800' :
            result.confidence_level >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {result.confidence_level >= 0.8 ? 'High' :
             result.confidence_level >= 0.6 ? 'Medium' : 'Low'} Confidence
          </div>
        </div>

        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-700">
            {result.content}
          </div>
        </div>

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-800 mb-2">💡 Suggestions:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.suggestions.map((suggestion, idx) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions */}
        {result.questions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-800 mb-2">❓ Questions:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.questions.map((question, idx) => (
                <li key={idx}>{question}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Alternative Ideas (Coach) */}
        {result.alternative_ideas.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-800 mb-2">🌟 Alternative Ideas:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.alternative_ideas.map((idea, idx) => (
                <li key={idx}>{idea}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Rerun Results */}
        {result.rerun_results.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-800 mb-2">🔄 Multiple Perspectives:</h4>
            <div className="space-y-3">
              {result.rerun_results.map((rerunResult, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                  <div className="whitespace-pre-wrap">{rerunResult}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Analysis */}
        {result.competitor_analysis && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-800 mb-2">🏆 Competitive Analysis:</h4>
            <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded">
              {result.competitor_analysis}
            </div>
          </div>
        )}

        {/* Critique */}
        {result.critique && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-800 mb-2">🔍 Critical Analysis:</h4>
            <div className="text-sm text-gray-600 bg-red-50 p-3 rounded">
              {result.critique}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold text-gray-800">Template Multi-Agent Assistant</h1>
        <p className="text-gray-600">Select agents and get specialized analysis of your requests</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Agent Selection and Input */}
        <div className="w-1/3 p-4 border-r bg-white overflow-y-auto">
          <div className="space-y-4">
            {/* Agent Template Selection */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Select Agents</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTemplates.map(template => (
                  <label
                    key={template.id}
                    className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                      selectedTemplates.includes(template.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateToggle(template.id)}
                      className="mr-3"
                    />
                    <span className="text-xl mr-2">{template.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium" style={{color: template.color}}>
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {template.description}
                      </div>
                    </div>
                    {template.is_custom && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Custom
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* User Input */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Your Request</h3>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Describe what you want to create or analyze..."
                className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={executeSelectedAgents}
              disabled={isExecuting || selectedTemplates.length === 0 || !userInput.trim()}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                isExecuting || selectedTemplates.length === 0 || !userInput.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isExecuting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                `Analyze with ${selectedTemplates.length} Agent${selectedTemplates.length !== 1 ? 's' : ''}`
              )}
            </button>

            {/* Selected agents summary */}
            {selectedTemplates.length > 0 && (
              <div className="text-sm text-gray-600">
                <strong>Selected:</strong> {
                  selectedTemplates.map(id => {
                    const template = availableTemplates.find(t => t.id === id);
                    return template?.name;
                  }).join(', ')
                }
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 p-4 overflow-y-auto">
          {agentResults.length === 0 && !isExecuting ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">🤖</div>
                <p>Select agents and submit a request to see analysis results</p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Agent Analysis Results ({agentResults.length})
              </h2>
              {agentResults.map((result, index) => renderAgentResult(result, index))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateMultiAgentBuilder;