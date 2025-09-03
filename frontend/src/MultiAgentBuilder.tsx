import React, { useState, useEffect, useRef } from 'react';
import Breadcrumb from './Breadcrumb';
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';

// Types for multi-agent system
interface AgentInsight {
  id: string;
  agent_type: string;
  content: string;
  insight_type: string; // "concern", "suggestion", "question", "analysis", "recommendation"
  priority: number; // 1-3
  confidence: number; // 0.0-1.0
  timestamp: string;
  related_to?: string;
}

interface AgentReference {
  source_agent: string;
  target_agent: string;
  reference_type: string; // "question_for", "builds_on", "disagrees_with", "validates"
  source_insight_id: string;
  target_insight_id?: string;
  content: string;
  timestamp: string;
}

interface EnhancedAgentResponse {
  agent_type: string;
  content: string;
  suggestions: string[];
  critique?: string;
  handoff_to?: string;
  confidence_level: number;
  insights: AgentInsight[];
  questions_for_agents?: Record<string, string[]>;
  references_to_agents: AgentReference[];
  requires_input_from: string[];
  builds_on_insights: string[];
}

// Legacy interface for backward compatibility
interface AgentResponse {
  agent_type: string;
  content: string;
  suggestions: string[];
  critique?: string;
  handoff_to?: string;
  prototype_update?: Record<string, any>;
}

interface MultiAgentData {
  agent_responses: AgentResponse[] | EnhancedAgentResponse[];
  current_prototype: any;
}

// Helper functions for enhanced responses
const isEnhancedResponse = (response: AgentResponse | EnhancedAgentResponse): response is EnhancedAgentResponse => {
  return 'confidence_level' in response && 'insights' in response;
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600 bg-green-50';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getInsightTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    'concern': '⚠️',
    'suggestion': '💡',
    'question': '❓',
    'analysis': '📊',
    'recommendation': '✅'
  };
  return icons[type] || '📝';
};

const getReferenceTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    'question_for': '❓',
    'builds_on': '🔗',
    'disagrees_with': '❌',
    'validates': '✅',
    'supports': '👍',
    'relates_to': '🔗'
  };
  return icons[type] || '🔗';
};

interface PrototypeComponent {
  component: string;
  props?: Record<string, any>;
  children?: PrototypeComponent[];
  text?: string;
}

const AGENT_COLORS = {
  ui_designer: '#F4A6C8', // Light Cerise
  ux_researcher: '#DE3163', // Cerise  
  developer: '#B8255F', // Dark Cerise
  product_manager: '#9B1E4F', // Darker Cerise
  stakeholder: '#C2185B' // Cerise-Pink
};

const AGENT_NAMES = {
  ui_designer: 'UI Designer',
  ux_researcher: 'UX Researcher',
  developer: 'Developer',
  product_manager: 'Product Manager',
  stakeholder: 'Stakeholder'
};

const AGENT_EMOJIS = {
  ui_designer: '🎨',
  ux_researcher: '👥',
  developer: '⚡',
  product_manager: '📊',
  stakeholder: '🏢'
};

function MultiAgentBuilder() {
  // Workspace persistence
  const { workspaceState, saveState, clearWorkspace } = useWorkspacePersistence();
  
  // Non-persistent state (UI-only)
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState('ui_designer');
  const [prototype, setPrototype] = useState<PrototypeComponent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // const [isExtractingPRD, setIsExtractingPRD] = useState(false);
  // const [isExtractingDesign, setIsExtractingDesign] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [directChatInput, setDirectChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  // Persistent state (from workspace)
  const {
    currentRequest,
    agentResponses,
    importedDocs,
    agentConversations,
    prdDocument,
    // designDocument,
    showInsights,
    showReferences,
    showConfidence,
    showQuestions,
    synthesisView,
    activeTab
  } = workspaceState;
  
  // Prompt editing state
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [selectedPrompt, setSelectedPrompt] = useState<string>('single_agent_prompt');
  const [promptContent, setPromptContent] = useState<string>('');
  const [isSavingPrompt, setIsSavingPrompt] = useState<boolean>(false);

  // Stakeholder editor state
  const [showStakeholderEditor, setShowStakeholderEditor] = useState<boolean>(false);
  const [stakeholderName, setStakeholderName] = useState(AGENT_NAMES.stakeholder);
  const [stakeholderPrompt, setStakeholderPrompt] = useState('');
  
  const ws = useRef<WebSocket | null>(null);
  const sessionId = useRef(`multi-agent-session-${Date.now()}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const agentResponsesScrollRef = useRef<HTMLDivElement>(null);

  // Unified scroll to bottom function
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        if (ref.current) {
          // Force scroll to absolute bottom
          ref.current.scrollTop = ref.current.scrollHeight;
          
          // Double-check with a small delay to ensure it worked
          setTimeout(() => {
            if (ref.current) {
              ref.current.scrollTop = ref.current.scrollHeight;
            }
          }, 50);
          
          // Visual feedback - briefly highlight the scroll button
          const scrollButton = ref.current.parentElement?.querySelector('.scroll-button');
          if (scrollButton) {
            scrollButton.classList.add('animate-pulse');
            setTimeout(() => scrollButton.classList.remove('animate-pulse'), 500);
          }
        }
      });
    }
  };

  // Auto-scroll to bottom when new messages arrive (direct chat)
  useEffect(() => {
    scrollToBottom(chatScrollRef);
  }, [agentConversations, activeTab]);

  // Compute filtered responses
  const filteredResponses = activeTab === 'all' 
    ? agentResponses 
    : agentResponses.filter(response => response.agent_type === activeTab);
    
  // Helper functions for updating persistent state
  const updateAgentResponses = (responses: typeof agentResponses) => saveState({ agentResponses: responses });
  const updateCurrentRequest = (request: string) => saveState({ currentRequest: request });
  const updateImportedDocs = (docs: typeof importedDocs) => saveState({ importedDocs: docs });
  const updateAgentConversations = (conversations: typeof agentConversations) => saveState({ agentConversations: conversations });
  const updatePrdDocument = (doc: string | null) => saveState({ prdDocument: doc });
  const updateDesignDocument = (doc: string | null) => saveState({ designDocument: doc });
  const updateActiveTab = (tab: typeof activeTab) => saveState({ activeTab: tab });
  const updateShowInsights = (show: boolean) => saveState({ showInsights: show });
  const updateShowReferences = (show: boolean) => saveState({ showReferences: show });
  const updateShowConfidence = (show: boolean) => saveState({ showConfidence: show });
  const updateShowQuestions = (show: boolean) => saveState({ showQuestions: show });
  const updateSynthesisView = (view: boolean) => saveState({ synthesisView: view });
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('🔄 State changed - agentResponses:', agentResponses);
    console.log('🔄 State changed - isGenerating:', isGenerating);
    console.log('🔄 State changed - filteredResponses:', filteredResponses);
  }, [agentResponses, isGenerating, filteredResponses]);

  // Auto-scroll to bottom when new agent responses arrive
  useEffect(() => {
    scrollToBottom(agentResponsesScrollRef);
  }, [filteredResponses, activeTab]);

  // Additional scroll triggers for better coverage
  useEffect(() => {
    scrollToBottom(agentResponsesScrollRef);
  }, [agentResponses.length]);

  useEffect(() => {
    scrollToBottom(chatScrollRef);
  }, [Object.keys(agentConversations).length]);

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = `ws://localhost:8000/ws/${sessionId.current}`;
    console.log('🔌 Attempting WebSocket connection...');
    console.log('🔌 WebSocket URL:', wsUrl);
    console.log('🔌 Session ID:', sessionId.current);
    console.log('🔌 Current timestamp:', new Date().toISOString());
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      setConnected(true);
      console.log('🔌 WebSocket connected successfully to Multi-Agent AI Backend');
      console.log('🔌 WebSocket readyState:', ws.current?.readyState);
      console.log('🔌 WebSocket URL:', ws.current?.url);
      console.log('🔌 WebSocket protocol:', ws.current?.protocol);
    };
    
    // Initial scroll to bottom
    setTimeout(() => {
      scrollToBottom(agentResponsesScrollRef);
    }, 200);
    
    // Keyboard shortcut for scrolling to bottom
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'End') {
        e.preventDefault();
        if (activeTab === 'all') {
          scrollToBottom(agentResponsesScrollRef);
        } else {
          scrollToBottom(chatScrollRef);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    ws.current.onmessage = (event) => {
      console.log('📨 Raw WebSocket message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('🔍 Frontend received WebSocket message:', message);
        
        if (message.type === 'multi_agent_response') {
          console.log('✅ Processing multi_agent_response:', message.data);
          const data: MultiAgentData = message.data;
          console.log('📊 Agent responses:', data.agent_responses);
          console.log('🔧 Prototype:', data.current_prototype);
          updateAgentResponses(data.agent_responses);
          setPrototype(data.current_prototype);
          setIsGenerating(false);
          console.log('🎯 Set isGenerating to false');
          // Scroll to bottom when new agent responses arrive
          setTimeout(() => scrollToBottom(agentResponsesScrollRef), 100);
        } else if (message.type === 'agent_switched') {
        setCurrentAgent(message.data.current_agent);
      } else if (message.type === 'prd_extracted') {
        updatePrdDocument(message.data.content);
        // setIsExtractingPRD(false);
      } else if (message.type === 'design_doc_extracted') {
        updateDesignDocument(message.data.content);
        // setIsExtractingDesign(false);
              } else if (message.type === 'direct_chat_response') {
          const { agent_type, response } = message.data;
          updateAgentConversations({
            ...agentConversations,
            [agent_type]: [
              ...(agentConversations[agent_type] || []),
              { role: 'agent', content: response, timestamp: new Date() }
            ]
          });
          setIsChatting(false);
          // Scroll to bottom when new chat response arrives
          setTimeout(() => scrollToBottom(chatScrollRef), 100);
        } else if (message.type === 'prompts_list') {
          console.log('📝 Received prompts:', message.data.prompts);
          setPrompts(message.data.prompts);
          if (message.data.prompts[selectedPrompt]) {
            setPromptContent(message.data.prompts[selectedPrompt]);
          } else if (Object.keys(message.data.prompts).length > 0) {
            // If selected prompt doesn't exist, use the first available prompt
            const firstPrompt = Object.keys(message.data.prompts)[0];
            setSelectedPrompt(firstPrompt);
            setPromptContent(message.data.prompts[firstPrompt]);
          }
        } else if (message.type === 'prompt_saved') {
          setIsSavingPrompt(false);
          console.log('✅ Prompt saved successfully:', message.data.prompt_name);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.error('📨 Raw message data:', event.data);
      }
      };
    
    ws.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.error('🔌 WebSocket readyState:', ws.current?.readyState);
      console.error('🔌 WebSocket URL:', ws.current?.url);
      console.error('🔌 Error event type:', error.type);
      console.error('🔌 Error event target:', error.target);
      setConnected(false);
    };

    ws.current.onclose = (event) => {
      setConnected(false);
      console.log('🔌 WebSocket connection closed');
      console.log('🔌 Close event code:', event.code);
      console.log('🔌 Close event reason:', event.reason);
      console.log('🔌 Close event wasClean:', event.wasClean);
    };
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      ws.current?.close();
    };
  }, []);

  const sendMultiAgentRequest = () => {
    if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
      console.log('🚀 Sending multi-agent request:', input.trim());
      console.log('🔌 WebSocket state:', ws.current.readyState);
      console.log('🔌 WebSocket OPEN:', WebSocket.OPEN);
      console.log('🔌 WebSocket connected:', ws.current.readyState === WebSocket.OPEN);
      
      setIsGenerating(true);
      const requestText = input.trim();
      updateCurrentRequest(requestText);
      
      // Send request with full context including imported documents
      const requestData = { 
        text: requestText,
        type: 'multi_agent_prototype',
        context: {
          imported_documents: importedDocs,
          current_request: requestText
        }
      };
      console.log('📤 Sending WebSocket message:', requestData);
      
      try {
        ws.current.send(JSON.stringify(requestData));
        console.log('✅ WebSocket message sent successfully');
        
        // Add timeout to detect if backend is not responding
        setTimeout(() => {
          if (isGenerating) {
            console.warn('⚠️ Backend not responding after 30 seconds, resetting state');
            setIsGenerating(false);
          }
        }, 30000);
        
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        setIsGenerating(false);
      }
      
      setInput('');
      // Scroll to bottom after sending request
      setTimeout(() => scrollToBottom(agentResponsesScrollRef), 100);
    } else {
      console.log('❌ Cannot send request:', {
        hasInput: !!input.trim(),
        wsState: ws.current?.readyState,
        wsOpen: ws.current?.readyState === WebSocket.OPEN
      });
    }
  };

  const switchAgent = (agentType: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'switch_agent',
        agent: agentType
      }));
    }
  };

  // Scroll to bottom when tab changes
  const handleTabChange = (tab: typeof activeTab) => {
    updateActiveTab(tab);
    // Scroll to bottom after tab change
    setTimeout(() => {
      if (tab === 'all') {
        scrollToBottom(agentResponsesScrollRef);
      } else {
        scrollToBottom(chatScrollRef);
      }
    }, 100);
  };

  const clearCurrentRequest = () => {
    updateCurrentRequest('');
    updateAgentResponses([]);
    setPrototype(null);
  };

  // const extractPRD = () => {
  //   if (ws.current?.readyState === WebSocket.OPEN && agentResponses.length > 0) {
  //     setIsExtractingPRD(true);
  //     ws.current.send(JSON.stringify({
  //       type: 'generate_prd',
  //       data: {
  //         agent_responses: agentResponses,
  //         prototype: prototype
  //       }
  //     }));
  //   }
  // };

  // const extractDesignDoc = () => {
  //   if (ws.current?.readyState === WebSocket.OPEN && agentResponses.length > 0) {
  //     setIsExtractingDesign(true);
  //     ws.current.send(JSON.stringify({
  //       type: 'extract_design_doc',
  //       data: {
  //         agent_responses: agentResponses,
  //         prototype: prototype
  //       }
  //     }));
  //   }
  // };

  const handleImportDocs = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    const newDocs: Array<{name: string, content: string, type: string}> = [];

    try {
      for (const file of Array.from(files)) {
        const content = await readFileContent(file);
        newDocs.push({
          name: file.name,
          content: content,
          type: file.type || 'text/plain'
        });
      }

      updateImportedDocs([...importedDocs, ...newDocs]);

      // Send imported docs to backend for context
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'import_documents',
          data: {
            documents: newDocs
          }
        }));
      }
    } catch (error) {
      console.error('Error importing documents:', error);
      alert('Error importing some documents. Please try again.');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = (_e) => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      // Handle different file types
      if (file.type.includes('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For other files, read as text and let backend handle parsing if needed
        reader.readAsText(file);
      }
    });
  };

  const loadPrompts = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('🔄 Loading prompts...');
      ws.current.send(JSON.stringify({
        type: 'get_prompts'
      }));
    } else {
      console.error('❌ WebSocket not connected when trying to load prompts');
    }
  };

  const savePrompt = () => {
    if (ws.current?.readyState === WebSocket.OPEN && selectedPrompt && promptContent.trim()) {
      setIsSavingPrompt(true);
      ws.current.send(JSON.stringify({
        type: 'save_prompt',
        data: {
          prompt_name: selectedPrompt,
          content: promptContent.trim()
        }
      }));
    }
  };

  const openPromptEditor = () => {
    setShowPromptEditor(true);
    loadPrompts();
  };

  const handlePromptChange = (promptName: string) => {
    setSelectedPrompt(promptName);
    if (prompts[promptName]) {
      setPromptContent(prompts[promptName]);
    }
  };

  const handleDirectChat = () => {
    if (directChatInput.trim() && activeTab !== 'all' && ws.current?.readyState === WebSocket.OPEN) {
      setIsChatting(true);
      
      // Add user message to conversation history
      updateAgentConversations({
        ...agentConversations,
        [activeTab]: [
          ...(agentConversations[activeTab] || []),
          { role: 'user', content: directChatInput, timestamp: new Date() }
        ]
      });
      
      // Scroll to bottom immediately after adding user message
      setTimeout(() => scrollToBottom(chatScrollRef), 50);
      
      // Send to backend
      ws.current.send(JSON.stringify({
        type: 'direct_chat',
        data: {
          agent_type: activeTab,
          message: directChatInput,
          context: {
            original_request: currentRequest,
            agent_responses: agentResponses,
            prototype: prototype,
            conversation_history: agentConversations[activeTab] || [],
            current_request: currentRequest,
            imported_documents: importedDocs,
            main_topic: currentRequest ? `The main topic being discussed is: "${currentRequest}"` : null
          }
        }
      }));
      
      setDirectChatInput('');
      // Scroll to bottom after sending chat message
      setTimeout(() => scrollToBottom(chatScrollRef), 100);
    }
  };

  const renderPrototype = (spec: PrototypeComponent): React.ReactElement | null => {
    if (!spec) return null;
    
    const { component, props = {}, children = [], text } = spec;
    const key = `${component}-${Math.random()}`;
    
    const childElements = children.map((child, _index) => 
      renderPrototype(child)
    );
    
    switch(component) {
      case 'button':
        return (
          <button 
            key={key}
            {...props}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => alert(`Button clicked: ${text || 'Unknown'}`)}
          >
            {text || childElements}
          </button>
        );
      case 'input':
        return <input key={key} {...props} className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />;
      case 'div':
        return <div key={key} {...props}>{text || childElements}</div>;
      case 'h1':
        return <h1 key={key} {...props} className="text-3xl font-bold text-gray-900">{text || childElements}</h1>;
      case 'h2':
        return <h2 key={key} {...props} className="text-2xl font-semibold text-gray-800">{text || childElements}</h2>;
      case 'h3':
        return <h3 key={key} {...props} className="text-xl font-medium text-gray-700">{text || childElements}</h3>;
      case 'p':
        return <p key={key} {...props} className="text-gray-600">{text || childElements}</p>;
      case 'form':
        return (
          <form 
            key={key}
            {...props} 
            onSubmit={(e) => {
              e.preventDefault();
              alert('Form submitted successfully!');
            }} 
            className="space-y-4"
          >
            {childElements}
          </form>
        );
      case 'label':
        return <label key={key} {...props} className="block text-sm font-medium text-gray-700">{text || childElements}</label>;
      default:
        return <div key={key} {...props}>{text || childElements}</div>;
    }
  };

  const saveStakeholder = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'save_stakeholder',
        data: {
          name: stakeholderName,
          prompt: stakeholderPrompt
        }
      }));
      setShowStakeholderEditor(false);
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1f2937 0%, #2d1b69 50%, #9B1E4F 100%)', 
        color: 'white', 
        padding: '1rem',
        borderBottom: '2px solid var(--cerise-light)',
        margin: '0 10mm',
        borderRadius: '0 0 16px 16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            margin: 0,
            background: 'linear-gradient(45deg, #FDF2F8, #F4A6C8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>PRD & Systems Design Assistant</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={`flex items-center text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-sm">
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                background: 'linear-gradient(45deg, var(--cerise-light), var(--cerise))',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '500',
                color: 'white',
                boxShadow: '0 2px 4px rgba(222, 49, 99, 0.3)'
              }}>
                🎭 Multi-Agent
              </span>
              <span style={{ marginLeft: '0.5rem' }}>
                {AGENT_EMOJIS[currentAgent as keyof typeof AGENT_EMOJIS]} {AGENT_NAMES[currentAgent as keyof typeof AGENT_NAMES]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[
        { label: 'Multi-Agent Builder', icon: '👥' },
      ]} />

      {/* Main Content Container with Padding */}
      <div style={{ 
        padding: '0 10mm',
        height: 'calc(100vh - 72px)'
      }}>
        {/* Main Content - Split Layout */}
        <div style={{ 
          display: 'flex', 
          height: '100%',
          borderTop: '2px solid var(--cerise-light)',
          borderBottom: '2px solid var(--cerise-light)',
          borderLeft: '2px solid var(--cerise-light)',
          borderRight: '2px solid var(--cerise-light)',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(222, 49, 99, 0.15)'
        }}>
        {/* LEFT PANEL - User Input (20%) */}
        <div style={{ 
          width: '20%', 
          backgroundColor: 'white', 
          borderRight: '2px solid var(--cerise-light)',
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '16px 0 0 0'
        }}>
                     {/* User Input Section */}
           <div style={{ 
             padding: '1.5rem', 
             borderBottom: '1px solid #e5e7eb',
             borderRadius: '16px 0 0 0'
           }}>
             <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', margin: '0 0 1rem 0' }}>
               {currentRequest ? 'Current Request' : 'Describe Your Requirements'}
             </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             <textarea
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder={currentRequest 
                   ? "Add more details or ask follow-up questions about your request..." 
                   : "Describe your product requirements, features, or system needs..."
                 }
                 rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  resize: 'none',
                  outline: 'none'
                }}
                disabled={!connected || isGenerating}
              />
                             {currentRequest ? (
                 <div className="flex gap-2">
                   <button 
                     onClick={sendMultiAgentRequest}
                     disabled={!connected || isGenerating || !input.trim()}
                     style={{
                       flex: '1',
                       padding: '0.75rem 1rem',
                       borderRadius: '0.75rem',
                       fontWeight: '600',
                       border: 'none',
                       cursor: connected && !isGenerating && input.trim() ? 'pointer' : 'not-allowed',
                       background: connected && !isGenerating && input.trim() 
                         ? 'linear-gradient(135deg, var(--cerise-light), var(--cerise), var(--cerise-dark))'
                         : '#9ca3af',
                       color: 'white',
                       transition: 'all 0.3s ease',
                       boxShadow: connected && !isGenerating && input.trim() 
                         ? '0 4px 15px rgba(222, 49, 99, 0.4)' 
                         : 'none',
                       transform: 'translateY(0)'
                     }}
                     onMouseEnter={(e) => {
                       if (connected && !isGenerating && input.trim()) {
                         e.currentTarget.style.transform = 'translateY(-2px)';
                         e.currentTarget.style.boxShadow = '0 6px 20px rgba(222, 49, 99, 0.5)';
                       }
                     }}
                     onMouseLeave={(e) => {
                       e.currentTarget.style.transform = 'translateY(0)';
                       e.currentTarget.style.boxShadow = connected && !isGenerating && input.trim() 
                         ? '0 4px 15px rgba(222, 49, 99, 0.4)' 
                         : 'none';
                     }}
                   >
                     {isGenerating ? '🤖 Analyzing Requirements...' : '📋 Analyze Requirements'}
                   </button>
                   <button 
                     onClick={clearCurrentRequest}
                     disabled={!connected || isGenerating}
                     style={{
                       padding: '0.75rem 1rem',
                       borderRadius: '0.75rem',
                       fontWeight: '600',
                       border: '2px solid var(--cerise-light)',
                       cursor: connected && !isGenerating ? 'pointer' : 'not-allowed',
                       background: 'white',
                       color: 'var(--cerise)',
                       transition: 'all 0.3s ease'
                     }}
                   >
                     ✕ Clear
                   </button>
                 </div>
               ) : (
                 <button 
                   onClick={sendMultiAgentRequest}
                   disabled={!connected || isGenerating || !input.trim()}
                   style={{
                     width: '100%',
                     padding: '0.75rem 1rem',
                     borderRadius: '0.75rem',
                     fontWeight: '600',
                     border: 'none',
                     cursor: connected && !isGenerating && input.trim() ? 'pointer' : 'not-allowed',
                     background: connected && !isGenerating && input.trim() 
                       ? 'linear-gradient(135deg, var(--cerise-light), var(--cerise), var(--cerise-dark))'
                       : '#9ca3af',
                     color: 'white',
                     transition: 'all 0.3s ease',
                     boxShadow: connected && !isGenerating && input.trim() 
                       ? '0 4px 15px rgba(222, 49, 99, 0.4)' 
                       : 'none',
                     transform: 'translateY(0)'
                   }}
                   onMouseEnter={(e) => {
                     if (connected && !isGenerating && input.trim()) {
                       e.currentTarget.style.transform = 'translateY(-2px)';
                       e.currentTarget.style.boxShadow = '0 6px 20px rgba(222, 49, 99, 0.5)';
                     }
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'translateY(0)';
                     e.currentTarget.style.boxShadow = connected && !isGenerating && input.trim() 
                       ? '0 4px 15px rgba(222, 49, 99, 0.4)' 
                       : 'none';
                   }}
                 >
                   {isGenerating ? '🤖 Analyzing Requirements...' : '📋 Analyze Requirements'}
                 </button>
               )}
            </div>
          </div>

        </div>

        {/* CENTER PANEL - Controls (10%) */}
        <div style={{ 
          width: '10%', 
          backgroundColor: '#f9fafb', 
          borderRight: '2px solid var(--cerise-light)',
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          padding: '16px 8px'
        }}>
          {/* Agent Selection - Vertical */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#374151', textAlign: 'center' }}>Agents</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(AGENT_NAMES).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => switchAgent(key)}
                  title={name}
                  className={`p-2 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                    currentAgent === key
                      ? 'text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-cerise-light hover:bg-cerise-lighter'
                  }`}
                  style={{
                    background: currentAgent === key 
                      ? `linear-gradient(135deg, ${AGENT_COLORS[key as keyof typeof AGENT_COLORS]}, var(--cerise-dark))`
                      : undefined,
                    borderColor: currentAgent === key 
                      ? AGENT_COLORS[key as keyof typeof AGENT_COLORS]
                      : undefined,
                    boxShadow: currentAgent === key 
                      ? `0 4px 15px ${AGENT_COLORS[key as keyof typeof AGENT_COLORS]}40`
                      : undefined,
                    minHeight: '44px'
                  }}
                >
                  <div className="text-lg">{AGENT_EMOJIS[key as keyof typeof AGENT_EMOJIS]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions - Vertical */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#374151', textAlign: 'center' }}>Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={handleImportDocs}
                disabled={isImporting}
                title="Import Documents"
                style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  background: isImporting ? '#9ca3af' : 'linear-gradient(135deg, var(--cerise-light), var(--cerise))', 
                  color: 'white', 
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                📁
              </button>
              {/* <button 
                onClick={extractPRD}
                disabled={!agentResponses.length}
                title="Extract PRD"
                style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  background: agentResponses.length ? 'linear-gradient(135deg, var(--cerise-light), var(--cerise))' : '#9ca3af', 
                  color: 'white', 
                  fontSize: '16px'
                }}
              >
                📋
              </button>
              <button 
                onClick={extractDesignDoc}
                disabled={!agentResponses.length}
                title="Extract Design Doc"
                style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  background: agentResponses.length ? 'linear-gradient(135deg, var(--cerise-light), var(--cerise))' : '#9ca3af', 
                  color: 'white', 
                  fontSize: '16px'
                }}
              >
                🎨
              </button> */}
              <button 
                onClick={openPromptEditor}
                title="Edit AI Prompts"
                style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  background: 'linear-gradient(135deg, var(--cerise-light), var(--cerise))', 
                  color: 'white', 
                  fontSize: '16px'
                }}
              >
                ⚙️
              </button>
              <button
                onClick={() => setShowStakeholderEditor(true)}
                title="Edit Stakeholder Persona"
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--cerise-light), var(--cerise))',
                  color: 'white',
                  fontSize: '16px'
                }}
              >
                👤
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Clear all workspace data? This will remove your current request, agent responses, imported documents, and chat history.')) {
                    clearWorkspace();
                    setPrototype(null);
                    setInput('');
                    setDirectChatInput('');
                  }
                }}
                title="Clear Workspace"
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  fontSize: '16px'
                }}
              >
                🗑️
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.csv,.doc,.docx,.pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Enhanced Features - Vertical */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#374151', textAlign: 'center' }}>Features</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showConfidence}
                  onChange={(e) => updateShowConfidence(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '2rem',
                  height: '1rem',
                  borderRadius: '9999px',
                  backgroundColor: showConfidence ? 'var(--cerise)' : '#d1d5db',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transform: `translateX(${showConfidence ? '1.25rem' : '0.125rem'})`,
                    transition: 'transform 0.2s',
                    marginTop: '0.125rem'
                  }}></div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>Confidence</span>
              </label>
              
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showInsights}
                  onChange={(e) => updateShowInsights(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '2rem',
                  height: '1rem',
                  borderRadius: '9999px',
                  backgroundColor: showInsights ? 'var(--cerise)' : '#d1d5db',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transform: `translateX(${showInsights ? '1.25rem' : '0.125rem'})`,
                    transition: 'transform 0.2s',
                    marginTop: '0.125rem'
                  }}></div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>Insights</span>
              </label>
              
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showReferences}
                  onChange={(e) => updateShowReferences(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '2rem',
                  height: '1rem',
                  borderRadius: '9999px',
                  backgroundColor: showReferences ? 'var(--cerise)' : '#d1d5db',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transform: `translateX(${showReferences ? '1.25rem' : '0.125rem'})`,
                    transition: 'transform 0.2s',
                    marginTop: '0.125rem'
                  }}></div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>References</span>
              </label>
              
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showQuestions}
                  onChange={(e) => updateShowQuestions(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '2rem',
                  height: '1rem',
                  borderRadius: '9999px',
                  backgroundColor: showQuestions ? 'var(--cerise)' : '#d1d5db',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transform: `translateX(${showQuestions ? '1.25rem' : '0.125rem'})`,
                    transition: 'transform 0.2s',
                    marginTop: '0.125rem'
                  }}></div>
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>Questions</span>
              </label>
              
              <button
                onClick={() => updateSynthesisView(!synthesisView)}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: '500',
                  backgroundColor: synthesisView ? 'var(--cerise)' : '#f3f4f6',
                  color: synthesisView ? 'white' : '#6b7280',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                📊 Synthesis
              </button>
              
              <div style={{ 
                fontSize: '10px', 
                color: '#6b7280', 
                textAlign: 'center', 
                marginTop: '12px',
                padding: '6px',
                borderTop: '1px solid #e5e7eb'
              }}>
                {currentRequest && (
                  <div style={{ marginBottom: '4px' }}>💾 Workspace saved</div>
                )}
                {importedDocs.length > 0 && (
                  <div>{importedDocs.length} docs loaded</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - AI Commentary & Chat (70%) */}
        <div style={{ 
          width: '70%', 
          backgroundColor: '#f9fafb', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '0 16px 0 0'
        }}>
          {/* Agent Tabs */}
          <div style={{ 
            backgroundColor: 'white', 
            borderBottom: '1px solid #e5e7eb', 
            padding: '1rem',
            borderRadius: '0 16px 0 0'
          }}>

            {/* Agent Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleTabChange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'all'
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-cerise-lighter hover:text-cerise-dark'
                }`}
                style={{
                  background: activeTab === 'all' 
                    ? 'linear-gradient(135deg, var(--cerise), var(--cerise-dark))'
                    : undefined,
                  boxShadow: activeTab === 'all' 
                    ? '0 4px 15px rgba(222, 49, 99, 0.3)'
                    : undefined
                }}
              >
                All Agents
              </button>
              {Object.entries(AGENT_NAMES).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === key
                      ? 'text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-cerise-lighter hover:text-cerise-dark'
                  }`}
                  style={{
                    background: activeTab === key 
                      ? `linear-gradient(135deg, ${AGENT_COLORS[key as keyof typeof AGENT_COLORS]}, var(--cerise-dark))`
                      : undefined,
                    boxShadow: activeTab === key 
                      ? `0 4px 15px ${AGENT_COLORS[key as keyof typeof AGENT_COLORS]}40`
                      : undefined
                  }}
                >
                  {AGENT_EMOJIS[key as keyof typeof AGENT_EMOJIS]} {name}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Comments */}
          <div className="relative flex-1 flex flex-col" style={{ minHeight: 0 }}>
            {/* Current Request Display */}
            {currentRequest && (
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">📋</span>
                    <h3 className="font-semibold text-gray-800">Current Request</h3>
                  </div>
                  <button
                    onClick={clearCurrentRequest}
                    className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors border border-red-200"
                    title="Clear current request and start fresh"
                  >
                    ✕ Clear
                  </button>
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded p-3 border-l-4 border-cerise">
                  {currentRequest}
                </div>
                
                {/* Imported Documents Context */}
                {importedDocs.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center mb-2">
                      <span className="text-sm mr-2">📁</span>
                      <span className="text-sm font-medium text-gray-700">Available Documents ({importedDocs.length})</span>
                      <button
                        onClick={() => updateImportedDocs([])}
                        className="ml-auto text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Clear all imported documents"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-1">
                      {importedDocs.map((doc: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 flex items-center justify-between">
                          <span className="truncate">{doc.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{doc.type}</span>
                            <button
                              onClick={() => {
                                const updatedDocs = importedDocs.filter((_: any, i: number) => i !== idx);
                                updateImportedDocs(updatedDocs);
                              }}
                              className="text-red-500 hover:text-red-700 text-xs"
                              title="Remove this document"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div ref={agentResponsesScrollRef} className="p-6 space-y-4" style={{ 
              overflowY: 'auto', 
              minHeight: 0,
              maxHeight: 'calc(100vh - 600px)',
              paddingBottom: '60px'
            }}>
            {filteredResponses.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-3">💬</div>
                <div className="font-medium mb-2">AI Agent Commentary</div>
                <div className="text-sm">Agent insights and suggestions will appear here</div>
              </div>
            ) : synthesisView ? (
              <SynthesisView responses={filteredResponses} />
            ) : (
              filteredResponses.map((response: any, index: number) => {
                const isEnhanced = isEnhancedResponse(response);
                
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg border-l-4 p-5 shadow-sm"
                    style={{ borderLeftColor: AGENT_COLORS[response.agent_type as keyof typeof AGENT_COLORS] }}
                  >
                    {/* Enhanced Agent Header */}
                    <div className="flex items-center mb-3">
                      <div className="text-xl mr-2">
                        {AGENT_EMOJIS[response.agent_type as keyof typeof AGENT_EMOJIS]}
                      </div>
                      <div className="font-semibold text-gray-800">
                        {AGENT_NAMES[response.agent_type as keyof typeof AGENT_NAMES]}
                      </div>
                      
                      {/* Enhanced Confidence Badge */}
                      {isEnhanced && showConfidence && (
                        <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(response.confidence_level)}`}>
                          {Math.round(response.confidence_level * 100)}% confident
                        </div>
                      )}
                      
                      {response.handoff_to && (
                        <div className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          → Handoff to {AGENT_NAMES[response.handoff_to as keyof typeof AGENT_NAMES]}
                        </div>
                      )}
                    </div>

                    {/* Agent Content */}
                    <div className="text-gray-700 mb-4 text-sm leading-relaxed">
                      {response.content}
                    </div>

                    {/* Enhanced Insights Section */}
                    {isEnhanced && showInsights && response.insights.length > 0 && (
                      <div className="mb-4 bg-gray-50 rounded-lg p-3 border">
                        <div className="font-medium text-gray-800 mb-2 text-sm flex items-center">
                          <span className="mr-2">🧠</span>
                          Structured Insights ({response.insights.length})
                        </div>
                        <div className="space-y-2">
                          {response.insights.map((insight, i) => (
                            <div key={i} className="bg-white rounded border-l-2 border-gray-300 p-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center text-xs">
                                  <span className="mr-1">{getInsightTypeIcon(insight.insight_type)}</span>
                                  <span className="font-medium capitalize">{insight.insight_type}</span>
                                  <span className="mx-1">•</span>
                                  <span className="text-gray-500">Priority {insight.priority}</span>
                                </div>
                                <div className={`px-1 py-0.5 rounded text-xs ${getConfidenceColor(insight.confidence)}`}>
                                  {Math.round(insight.confidence * 100)}%
                                </div>
                              </div>
                              <div className="text-sm text-gray-700">{insight.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions for Other Agents */}
                    {isEnhanced && showQuestions && response.questions_for_agents && Object.keys(response.questions_for_agents).length > 0 && (
                      <div className="mb-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="font-medium text-blue-800 mb-2 text-sm flex items-center">
                          <span className="mr-2">❓</span>
                          Questions for Other Agents
                        </div>
                        {Object.entries(response.questions_for_agents).map(([agentType, questions]) => (
                          <div key={agentType} className="mb-2 last:mb-0">
                            <div className="text-xs font-medium text-blue-700 mb-1">
                              → {AGENT_NAMES[agentType as keyof typeof AGENT_NAMES]}:
                            </div>
                            <ul className="space-y-1 ml-3">
                              {questions.map((question, i) => (
                                <li key={i} className="text-sm text-blue-600 flex items-start">
                                  <span className="text-blue-400 mr-2">•</span>
                                  {question}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cross-Agent References */}
                    {isEnhanced && showReferences && response.references_to_agents.length > 0 && (
                      <div className="mb-4 bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="font-medium text-purple-800 mb-2 text-sm flex items-center">
                          <span className="mr-2">🔗</span>
                          Cross-Agent References ({response.references_to_agents.length})
                        </div>
                        <div className="space-y-1">
                          {response.references_to_agents.map((ref, i) => (
                            <div key={i} className="text-sm text-purple-700 flex items-start">
                              <span className="mr-2">{getReferenceTypeIcon(ref.reference_type)}</span>
                              <span>
                                <strong>{ref.reference_type.replace(/_/g, ' ')}</strong> {AGENT_NAMES[ref.target_agent as keyof typeof AGENT_NAMES]}:
                                <span className="ml-1 text-purple-600">{ref.content}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Required Input From Other Agents */}
                    {isEnhanced && response.requires_input_from.length > 0 && (
                      <div className="mb-4 bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <div className="font-medium text-orange-800 mb-2 text-sm flex items-center">
                          <span className="mr-2">⏳</span>
                          Requires Input From:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {response.requires_input_from.map((agentType, i) => (
                            <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                              {AGENT_NAMES[agentType as keyof typeof AGENT_NAMES]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Traditional Suggestions (for backward compatibility) */}
                    {response.suggestions.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium text-gray-800 mb-2 text-sm">💡 Suggestions:</div>
                        <ul className="space-y-1">
                          {response.suggestions.map((suggestion: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Critique */}
                    {response.critique && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="font-medium text-yellow-800 mb-1 text-sm">⚠️ Critique:</div>
                        <div className="text-yellow-700 text-sm">{response.critique}</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
            
            

            {/* Direct Chat Input - Fixed at bottom */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderTop: '2px solid var(--cerise-light)',
              padding: '16px',
              borderRadius: '0 0 16px 0',
              minHeight: '100px',
              maxHeight: 'calc(30vh + 80px)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Expanded conversation history - 30% of page height */}
              {activeTab !== 'all' && agentConversations[activeTab]?.length > 0 && (
                <div style={{ 
                  marginBottom: '8px', 
                  height: '30vh',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px',
                  backgroundColor: '#fafafa'
                }}>
                  <div className="space-y-2">
                    {agentConversations[activeTab].map((msg: any, idx: number) => (
                      <div key={idx} className={`text-sm p-3 rounded ${
                        msg.role === 'user' 
                          ? 'bg-gray-100 text-gray-800 ml-2' 
                          : 'bg-cerise-lighter text-gray-700 mr-2'
                      }`}>
                        <div className="font-medium text-xs mb-1">
                          {msg.role === 'user' ? '👤 You' : `${AGENT_EMOJIS[activeTab as keyof typeof AGENT_EMOJIS]} ${AGENT_NAMES[activeTab as keyof typeof AGENT_NAMES]}`}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              
              <div style={{ 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>💬</span>
                Chat directly with {activeTab === 'all' ? 'agents' : AGENT_NAMES[activeTab as keyof typeof AGENT_NAMES]}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={directChatInput}
                  onChange={(e) => setDirectChatInput(e.target.value)}
                  placeholder={activeTab === 'all' 
                    ? "Select a specific agent tab to chat directly..." 
                    : `Ask ${AGENT_NAMES[activeTab as keyof typeof AGENT_NAMES]} a question...`
                  }
                  disabled={activeTab === 'all' || isChatting || !connected}
                  style={{
                    flex: '1',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: activeTab === 'all' ? '#f9fafb' : 'white'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleDirectChat();
                    }
                  }}
                />
                <button
                  onClick={handleDirectChat}
                  disabled={activeTab === 'all' || isChatting || !connected || !directChatInput.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: (activeTab !== 'all' && !isChatting && connected && directChatInput.trim()) ? 'pointer' : 'not-allowed',
                    background: (activeTab !== 'all' && !isChatting && connected && directChatInput.trim()) 
                      ? 'linear-gradient(135deg, var(--cerise-light), var(--cerise))' 
                      : '#9ca3af',
                    color: 'white',
                    minWidth: '80px',
                  }}
                >
                  {isChatting ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* PRD Document Display Modal */}
        {prdDocument && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '12px'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>📋 Extracted PRD Document</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      const timestamp = new Date().toISOString().split('T')[0];
                      const blob = new Blob([prdDocument], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `AI-Insurance-PRD-${timestamp}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    📥 Download Markdown
                  </button>
                  <button
                    onClick={() => updatePrdDocument(null)}
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              <div style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                maxHeight: '60vh',
                overflow: 'auto',
                color: '#374151'
              }}>
                {prdDocument}
              </div>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #d1fae5',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#065f46'
              }}>
                <strong>💾 Workspace Data:</strong> This PRD document and all your workspace data (requests, responses, conversations) are automatically saved and will persist when you navigate to other screens.
              </div>
            </div>
          </div>
        )}
        
        {/* Prompt Editor Modal */}
        {showPromptEditor && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '80%',
              maxWidth: '800px',
              maxHeight: '80%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                  ⚙️ AI Prompt Editor
                </h2>
                <button
                  onClick={() => setShowPromptEditor(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Select Prompt:
                </label>
                <select
                  value={selectedPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  {Object.keys(prompts).map(promptName => (
                    <option key={promptName} value={promptName}>
                      {promptName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Prompt Content:
                </label>
                <textarea
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  style={{
                    flex: 1,
                    minHeight: '300px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'none'
                  }}
                  placeholder="Enter the AI prompt content here..."
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setShowPromptEditor(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={savePrompt}
                  disabled={isSavingPrompt || !promptContent.trim()}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isSavingPrompt || !promptContent.trim() ? '#9ca3af' : '#7c3aed',
                    color: 'white',
                    cursor: isSavingPrompt || !promptContent.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSavingPrompt ? 'Saving...' : 'Save Prompt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stakeholder Editor Modal */}
        {showStakeholderEditor && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '80%',
              maxWidth: '800px',
              maxHeight: '80%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                  👤 Edit Stakeholder Persona
                </h2>
                <button
                  onClick={() => setShowStakeholderEditor(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Persona Name:
                </label>
                <input
                  type="text"
                  value={stakeholderName}
                  onChange={(e) => setStakeholderName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Persona Prompt:
                </label>
                <textarea
                  value={stakeholderPrompt}
                  onChange={(e) => setStakeholderPrompt(e.target.value)}
                  style={{
                    flex: 1,
                    minHeight: '300px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'none'
                  }}
                  placeholder="Enter the stakeholder prompt here..."
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setShowStakeholderEditor(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveStakeholder}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Save Persona
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Synthesis View Component
const SynthesisView: React.FC<{responses: (AgentResponse | EnhancedAgentResponse)[]}> = ({ responses }) => {
  const enhancedResponses = responses.filter(isEnhancedResponse);
  
  if (enhancedResponses.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-medium mb-2">No Enhanced Data Available</div>
        <div className="text-sm">Synthesis requires enhanced agent responses</div>
      </div>
    );
  }
  
  // Aggregate insights by type
  const insightsByType: Record<string, AgentInsight[]> = {};
  const allInsights: AgentInsight[] = [];
  const allReferences: AgentReference[] = [];
  const questionsByAgent: Record<string, string[]> = {};
  
  enhancedResponses.forEach(response => {
    allInsights.push(...response.insights);
    allReferences.push(...response.references_to_agents);
    
    if (response.questions_for_agents) {
      Object.entries(response.questions_for_agents).forEach(([agent, questions]) => {
        if (!questionsByAgent[agent]) questionsByAgent[agent] = [];
        questionsByAgent[agent].push(...questions);
      });
    }
  });
  
  // Group insights by type
  allInsights.forEach(insight => {
    if (!insightsByType[insight.insight_type]) {
      insightsByType[insight.insight_type] = [];
    }
    insightsByType[insight.insight_type].push(insight);
  });
  
  // Calculate average confidence by agent
  const confidenceByAgent: Record<string, number> = {};
  enhancedResponses.forEach(response => {
    confidenceByAgent[response.agent_type] = response.confidence_level;
  });
  
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{enhancedResponses.length}</div>
          <div className="text-sm text-blue-700">Active Agents</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{allInsights.length}</div>
          <div className="text-sm text-green-700">Total Insights</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{allReferences.length}</div>
          <div className="text-sm text-purple-700">Cross-References</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{Object.values(questionsByAgent).flat().length}</div>
          <div className="text-sm text-yellow-700">Questions Asked</div>
        </div>
      </div>
      
      {/* Confidence Levels */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">📊</span>
          Agent Confidence Levels
        </h3>
        <div className="space-y-2">
          {Object.entries(confidenceByAgent).map(([agent, confidence]) => (
            <div key={agent} className="flex items-center">
              <div className="w-24 text-sm text-gray-600">
                {AGENT_NAMES[agent as keyof typeof AGENT_NAMES]}
              </div>
              <div className="flex-1 mx-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${confidence * 100}%`,
                      backgroundColor: confidence >= 0.8 ? '#10b981' : confidence >= 0.6 ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                {Math.round(confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Insights by Type */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">🧠</span>
          Insights by Type
        </h3>
        <div className="grid gap-4">
          {Object.entries(insightsByType).map(([type, insights]) => (
            <div key={type} className="border rounded-lg p-3">
              <div className="flex items-center mb-2">
                <span className="mr-2">{getInsightTypeIcon(type)}</span>
                <span className="font-medium capitalize">{type}</span>
                <span className="ml-auto text-sm text-gray-500">({insights.length})</span>
              </div>
              <div className="space-y-2">
                {insights.slice(0, 3).map((insight, i) => (
                  <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {AGENT_NAMES[insight.agent_type as keyof typeof AGENT_NAMES]}
                      </span>
                      <span className={`text-xs px-1 rounded ${getConfidenceColor(insight.confidence)}`}>
                        {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                    {insight.content}
                  </div>
                ))}
                {insights.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{insights.length - 3} more {type} insights
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Cross-Agent Communication */}
      {allReferences.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <span className="mr-2">🔗</span>
            Agent Communication Network
          </h3>
          <div className="space-y-2">
            {allReferences.slice(0, 5).map((ref, i) => (
              <div key={i} className="flex items-center text-sm">
                <span className="w-20 text-gray-600 text-xs">
                  {AGENT_NAMES[ref.source_agent as keyof typeof AGENT_NAMES]}
                </span>
                <span className="mx-2">{getReferenceTypeIcon(ref.reference_type)}</span>
                <span className="w-20 text-gray-600 text-xs">
                  {AGENT_NAMES[ref.target_agent as keyof typeof AGENT_NAMES]}
                </span>
                <span className="mx-2 text-gray-400">:</span>
                <span className="flex-1 text-gray-700">{ref.content}</span>
              </div>
            ))}
            {allReferences.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                +{allReferences.length - 5} more cross-references
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Outstanding Questions */}
      {Object.keys(questionsByAgent).length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <span className="mr-2">❓</span>
            Outstanding Questions
          </h3>
          <div className="space-y-3">
            {Object.entries(questionsByAgent).map(([agent, questions]) => (
              <div key={agent}>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  For {AGENT_NAMES[agent as keyof typeof AGENT_NAMES]}:
                </div>
                <ul className="space-y-1 ml-4">
                  {questions.slice(0, 2).map((question, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {question}
                    </li>
                  ))}
                  {questions.length > 2 && (
                    <li className="text-xs text-gray-500">
                      +{questions.length - 2} more questions
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAgentBuilder;