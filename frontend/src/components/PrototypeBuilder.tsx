import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface LLMSettings {
  provider: string;
  model: string;
  temperature: number;
}

interface PrototypeComponent {
  component: string;
  props?: { [key: string]: any };
  children?: PrototypeComponent[];
  text?: string;
}

const PrototypeBuilder: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [sessionId] = useState(`proto-session-${Date.now()}`);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPrototype, setCurrentPrototype] = useState<PrototypeComponent | null>(null);
  const [generationHistory, setGenerationHistory] = useState<Array<{id: string, input: string, result: PrototypeComponent, timestamp: string}>>([]);
  
  // Image upload states
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  // LLM Settings
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7
  });
  
  // UI State
  const [styleMode, setStyleMode] = useState<'styled' | 'wireframe'>('styled');
  const [showCode, setShowCode] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(35);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLLMSettings();
    initializeWebSocket();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const loadLLMSettings = () => {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      const preferences = JSON.parse(saved);
      setLlmSettings({
        provider: preferences.llmProvider || 'openai',
        model: preferences.llmModel || 'gpt-4o-mini',
        temperature: preferences.llmTemperature || 0.7
      });
    }
  };

  const initializeWebSocket = () => {
    const wsUrl = `ws://localhost:8000/ws/${sessionId}`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      setSocket(newSocket);
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
      toast.error('Connection error. Retrying...');
    };
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'prototype':
        const prototypeData = data.data;
        setCurrentPrototype(prototypeData);
        setGenerationHistory(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            input: userInput,
            result: prototypeData,
            timestamp: new Date().toISOString()
          }
        ]);
        setIsGenerating(false);
        toast.success('Prototype generated successfully!');
        break;

      case 'image_analysis':
        const analysisData = data.data;
        setUserInput(analysisData.description || 'Analyzed image and ready to enhance');
        setIsAnalyzingImage(false);
        toast.success('Image analyzed! Description generated.');
        break;
        
      case 'error':
        toast.error(data.message || 'Generation failed');
        setIsGenerating(false);
        setIsAnalyzingImage(false);
        break;
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Image: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast.error('Connection not ready. Please wait...');
      return;
    }

    setIsAnalyzingImage(true);
    
    try {
      // Send image analysis request
      socket.send(JSON.stringify({
        type: 'analyze_image',
        data: {
          image: base64Image,
          llm_settings: llmSettings,
          context: {
            session_id: sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }));
    } catch (error) {
      console.error('Failed to send image analysis request:', error);
      toast.error('Failed to analyze image');
      setIsAnalyzingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const generatePrototype = async () => {
    if (!userInput.trim() && !uploadedImage) {
      toast.error('Please describe what you want to create or upload an image');
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast.error('Connection not ready. Please wait...');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Send generation request with LLM settings and optional image
      socket.send(JSON.stringify({
        type: 'generate_prototype',
        data: {
          text: userInput,
          image: uploadedImage,
          llm_settings: llmSettings,
          context: {
            style_mode: styleMode,
            session_id: sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }));
    } catch (error) {
      console.error('Failed to send generation request:', error);
      toast.error('Failed to send request');
      setIsGenerating(false);
    }
  };

  const renderPrototype = (component: PrototypeComponent): React.ReactNode => {
    if (!component) return null;

    const { component: type, props = {}, children = [], text } = component;
    const className = styleMode === 'wireframe' 
      ? `${props.className || ''} border border-gray-300 bg-gray-100`.trim()
      : props.className;

    switch (type) {
      case 'div':
        return (
          <div key={Math.random()} {...props} className={className}>
            {text}
            {children.map((child, index) => (
              <React.Fragment key={index}>{renderPrototype(child)}</React.Fragment>
            ))}
          </div>
        );

      case 'button':
        return (
          <button 
            key={Math.random()} 
            {...props} 
            className={className}
            onClick={() => toast.info('Button clicked!')}
          >
            {text}
            {children.map((child, index) => (
              <React.Fragment key={index}>{renderPrototype(child)}</React.Fragment>
            ))}
          </button>
        );

      case 'input':
        return (
          <input 
            key={Math.random()} 
            {...props} 
            className={className}
            placeholder={text || props.placeholder}
          />
        );

      case 'form':
        return (
          <form 
            key={Math.random()} 
            {...props} 
            className={className}
            onSubmit={(e) => { e.preventDefault(); toast.info('Form submitted!'); }}
          >
            {text}
            {children.map((child, index) => (
              <React.Fragment key={index}>{renderPrototype(child)}</React.Fragment>
            ))}
          </form>
        );

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const Tag = type as keyof JSX.IntrinsicElements;
        return (
          <Tag key={Math.random()} {...props} className={className}>
            {text}
            {children.map((child, index) => (
              <React.Fragment key={index}>{renderPrototype(child)}</React.Fragment>
            ))}
          </Tag>
        );

      case 'p':
      case 'span':
      case 'label':
        const TextTag = type as keyof JSX.IntrinsicElements;
        return (
          <TextTag key={Math.random()} {...props} className={className}>
            {text}
            {children.map((child, index) => (
              <React.Fragment key={index}>{renderPrototype(child)}</React.Fragment>
            ))}
          </TextTag>
        );

      case 'img':
        return (
          <img 
            key={Math.random()} 
            {...props} 
            className={className}
            alt={props.alt || text || 'Generated image'}
            src={props.src || 'https://via.placeholder.com/300x200?text=Image'}
          />
        );

      default:
        return (
          <div key={Math.random()} className={className}>
            <strong>[{type}]</strong> {text}
            {children.map((child, index) => (
              <React.Fragment key={index}>{renderPrototype(child)}</React.Fragment>
            ))}
          </div>
        );
    }
  };

  const exportCode = () => {
    if (!currentPrototype) return;

    const generateReactCode = (component: PrototypeComponent, indent = 0): string => {
      const { component: type, props = {}, children = [], text } = component;
      const indentStr = '  '.repeat(indent);
      
      let propsStr = Object.entries(props)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      
      if (propsStr) propsStr = ' ' + propsStr;

      if (children.length === 0 && !text) {
        return `${indentStr}<${type}${propsStr} />`;
      }

      let code = `${indentStr}<${type}${propsStr}>`;
      if (text) {
        code += `\n${indentStr}  ${text}`;
      }
      
      children.forEach(child => {
        code += `\n${generateReactCode(child, indent + 1)}`;
      });
      
      code += `\n${indentStr}</${type}>`;
      return code;
    };

    const code = generateReactCode(currentPrototype);
    navigator.clipboard.writeText(code);
    toast.success('React code copied to clipboard!');
  };

  const quickTemplates = [
    { name: 'Login Form', prompt: 'Create a modern login form with email, password, and submit button' },
    { name: 'Landing Page', prompt: 'Design a hero section for a SaaS landing page with heading, subtitle, and CTA button' },
    { name: 'Dashboard Card', prompt: 'Create a dashboard metrics card showing user statistics' },
    { name: 'Contact Form', prompt: 'Build a contact form with name, email, message fields and send button' },
    { name: 'Product Card', prompt: 'Design an e-commerce product card with image, title, price, and add to cart button' },
  ];

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Neural Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-cyan-900/10"></div>
        <div className="absolute top-32 left-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-32 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="neural-grid absolute inset-0"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/90 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 bg-clip-text tracking-wider">
              PROTOTYPE GENERATOR
            </h1>
            <p className="text-gray-400 font-light">AI-powered real-time UI generation with {llmSettings.provider.toUpperCase()}</p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Style Toggle */}
            <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 border border-gray-700">
              <button
                onClick={() => setStyleMode('styled')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  styleMode === 'styled'
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                🎨 STYLED
              </button>
              <button
                onClick={() => setStyleMode('wireframe')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  styleMode === 'wireframe'
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                📐 WIREFRAME
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportCode}
              disabled={!currentPrototype}
              className="px-6 py-3 bg-gray-800/50 backdrop-blur-sm text-gray-300 rounded-xl hover:bg-gray-700/50 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 border border-gray-700 hover:border-cyan-500/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold">EXPORT CODE</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input & Controls */}
        <div className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800" style={{ width: `${leftPanelWidth}%` }}>
          <div className="p-6 h-full flex flex-col">
            {/* LLM Settings Display */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-cyan-300 mb-3 flex items-center">
                🧠 NEURAL ENGINE
              </h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Provider</div>
                  <div className="text-white font-semibold">
                    {llmSettings.provider === 'openai' && '🔴 OpenAI'}
                    {llmSettings.provider === 'deepseek' && '🟦 DeepSeek'}
                    {llmSettings.provider === 'kimi' && '🟣 Kimi'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Model</div>
                  <div className="text-white font-semibold truncate">{llmSettings.model}</div>
                </div>
                <div>
                  <div className="text-gray-400">Temp</div>
                  <div className="text-white font-semibold">{llmSettings.temperature}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto">
              {/* User Input */}
              <div>
                <h3 className="font-bold text-xl text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-4">
                  DESCRIBE YOUR UI
                </h3>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Describe the UI component you want to create..."
                  className="w-full h-32 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400 text-sm leading-relaxed transition-all duration-300"
                />
              </div>

              {/* Image Upload */}
              <div>
                <h3 className="font-bold text-xl text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-4">
                  OR UPLOAD IMAGE
                </h3>
                
                {uploadedImage ? (
                  <div className="space-y-4">
                    {/* Uploaded Image Preview */}
                    <div className="relative group">
                      <img
                        src={uploadedImage}
                        alt="Uploaded UI reference"
                        className="w-full h-48 object-cover rounded-xl border border-gray-700"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <button
                          onClick={() => {
                            setUploadedImage(null);
                            setUserInput('');
                          }}
                          className="px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-colors"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>

                    {/* Analysis Status */}
                    {isAnalyzingImage && (
                      <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent"></div>
                          <span className="text-purple-300 font-medium">Analyzing image with AI Vision...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer hover:border-purple-400/50 ${
                      isDragOver
                        ? 'border-purple-400 bg-purple-500/10'
                        : 'border-gray-600 bg-gray-800/30'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <div className="space-y-4">
                      <div className="text-4xl">
                        {isDragOver ? '🎯' : '🖼️'}
                      </div>
                      <div>
                        <p className="text-purple-300 font-medium mb-2">
                          {isDragOver ? 'Drop your image here!' : 'Upload UI screenshot or mockup'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Drag & drop or click to browse • PNG, JPG, GIF • Max 10MB
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-700/50 px-2 py-1 rounded">Screenshots</span>
                        <span className="bg-gray-700/50 px-2 py-1 rounded">Mockups</span>
                        <span className="bg-gray-700/50 px-2 py-1 rounded">Wireframes</span>
                        <span className="bg-gray-700/50 px-2 py-1 rounded">Hand Sketches</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Templates */}
              <div>
                <h3 className="font-bold text-lg text-purple-400 mb-3">QUICK START</h3>
                <div className="grid grid-cols-1 gap-2">
                  {quickTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setUserInput(template.prompt)}
                      className="text-left p-3 bg-gray-800/30 border border-gray-700 rounded-lg hover:bg-gray-800/50 hover:border-purple-500/30 transition-all text-sm group"
                    >
                      <div className="font-medium text-white group-hover:text-purple-300">{template.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{template.prompt.slice(0, 60)}...</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation History */}
              {generationHistory.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-400 mb-3">HISTORY ({generationHistory.length})</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {generationHistory.slice().reverse().map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentPrototype(item.result);
                          setUserInput(item.input);
                        }}
                        className="w-full text-left p-3 bg-gray-800/20 border border-gray-700/50 rounded-lg hover:bg-gray-800/40 transition-all text-xs group"
                      >
                        <div className="text-white group-hover:text-cyan-300 font-medium truncate">
                          {item.input.slice(0, 40)}...
                        </div>
                        <div className="text-gray-500 mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-6 border-t border-gray-800">
              <button
                onClick={generatePrototype}
                disabled={isGenerating || !userInput.trim()}
                className={`w-full py-4 rounded-xl font-black text-lg tracking-wider transition-all duration-300 relative overflow-hidden ${
                  isGenerating || !userInput.trim()
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 text-white hover:shadow-2xl hover:shadow-cyan-500/25 transform hover:scale-105'
                }`}
              >
                <div className="relative z-10">
                  {isGenerating ? (
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <span>GENERATING...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <span>⚡</span>
                      <span>GENERATE PROTOTYPE</span>
                      <span>⚡</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Prototype Preview */}
        <div className="flex-1 flex flex-col relative z-10">
          <div className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
              LIVE PROTOTYPE PREVIEW
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="relative">
                    {/* Animated thinking indicator */}
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                      <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl">🎨</span>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text mb-4">
                      GENERATING PROTOTYPE
                      <span className="animate-pulse">
                        <span className="animate-bounce inline-block" style={{animationDelay: '0ms'}}>.</span>
                        <span className="animate-bounce inline-block" style={{animationDelay: '150ms'}}>.</span>
                        <span className="animate-bounce inline-block" style={{animationDelay: '300ms'}}>.</span>
                      </span>
                    </h3>
                    
                    <p className="text-gray-400 mb-4">
                      AI is crafting your UI component using {llmSettings.provider.toUpperCase()}
                    </p>
                    
                    <div className="flex items-center justify-center space-x-2 bg-gray-800/30 px-4 py-2 rounded-lg border border-gray-700">
                      <span className="text-xs text-cyan-300">ENGINE:</span>
                      <span className="text-xs text-white font-bold">
                        {llmSettings.provider === 'openai' && '🔴 OpenAI'}
                        {llmSettings.provider === 'deepseek' && '🟦 DeepSeek'}
                        {llmSettings.provider === 'kimi' && '🟣 Kimi'}
                      </span>
                      <span className="text-xs text-gray-400">{llmSettings.model}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentPrototype ? (
              <div className="max-w-4xl mx-auto">
                <div className={`rounded-xl overflow-hidden shadow-2xl ${styleMode === 'wireframe' ? 'border-2 border-gray-400' : 'border border-gray-700'}`}>
                  <div className="p-8 bg-white text-black">
                    {renderPrototype(currentPrototype)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center max-w-lg">
                  <div className="text-8xl mb-6 neural-pulse">🎨</div>
                  <h3 className="text-3xl font-bold mb-4 text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
                    NEURAL PROTOTYPE ENGINE
                  </h3>
                  <p className="text-lg leading-relaxed">
                    Describe your UI in natural language and watch it come to life with 
                    <span className="text-cyan-400 font-semibold"> real-time AI generation</span>.
                  </p>
                  <div className="mt-8 flex justify-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2 bg-gray-800/30 px-3 py-2 rounded-lg border border-gray-700">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>Real-time Generation</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800/30 px-3 py-2 rounded-lg border border-gray-700">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span>Multi-LLM Support</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800/30 px-3 py-2 rounded-lg border border-gray-700">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>Code Export</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrototypeBuilder;