import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

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

const AgentTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'default' | 'custom'>('all');

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    prompt: '',
    color: '#007bff',
    icon: '🤖'
  });


  const predefinedIcons = ['🤖', '🎨', '👥', '💻', '📊', '🏢', '🏆', '🔍', '🌟', '🔄', '❓', '🎯', '🔒', '📈', '⚡', '🎪', '🚀', '💎'];
  const predefinedColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d', '#17a2b8'];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/agent-templates/');
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      // Fallback to mock data when backend isn't available
      const mockTemplates = [
        {
          id: 'ui_designer_default',
          name: 'UI Designer',
          type: 'ui_designer',
          description: 'Expert in user interface design, visual aesthetics, and user experience patterns',
          prompt: 'You are a UI Designer agent specializing in creating beautiful, functional, and user-friendly interfaces...',
          color: '#3B82F6',
          icon: '🎨',
          is_active: true,
          is_custom: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'ux_researcher_default',
          name: 'UX Researcher',
          type: 'ux_researcher',
          description: 'Focused on user research, usability testing, and experience optimization',
          prompt: 'You are a UX Researcher agent specializing in understanding user behavior and improving experiences...',
          color: '#8B5CF6',
          icon: '👥',
          is_active: true,
          is_custom: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'developer_default',
          name: 'Developer',
          type: 'developer',
          description: 'Technical implementation expert with focus on code quality and performance',
          prompt: 'You are a Developer agent specializing in writing clean, efficient, and maintainable code...',
          color: '#06B6D4',
          icon: '💻',
          is_active: true,
          is_custom: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setTemplates(mockTemplates);
      toast.success('Loaded demo templates (backend offline)');
    }
  };

  const handleEditTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description,
      prompt: template.prompt,
      color: template.color,
      icon: template.icon
    });
    setIsEditing(true);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setEditForm({
      name: '',
      description: '',
      prompt: '',
      color: '#007bff',
      icon: '🤖'
    });
    setIsCreating(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (isCreating) {
        // Try to call backend, but fallback to local storage if offline
        try {
          const response = await fetch('http://localhost:8000/api/agent-templates/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: editForm.name,
              type: 'developer', // Default type for custom templates
              description: editForm.description,
              prompt: editForm.prompt,
              color: editForm.color,
              icon: editForm.icon
            })
          });

          if (response.ok) {
            toast.success('Template created successfully');
            loadTemplates();
          } else {
            throw new Error('Server error');
          }
        } catch (error) {
          // Fallback to local handling
          const newTemplate = {
            id: `custom_${Date.now()}`,
            name: editForm.name,
            type: 'developer',
            description: editForm.description,
            prompt: editForm.prompt,
            color: editForm.color,
            icon: editForm.icon,
            is_active: true,
            is_custom: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setTemplates(prev => [...prev, newTemplate]);
          toast.success('Template created locally (backend offline)');
        }
      } else if (selectedTemplate) {
        // Try to call backend, but fallback to local storage if offline
        try {
          const response = await fetch(`http://localhost:8000/api/agent-templates/${selectedTemplate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
          });

          if (response.ok) {
            toast.success('Template updated successfully');
            loadTemplates();
          } else {
            throw new Error('Server error');
          }
        } catch (error) {
          // Fallback to local handling
          setTemplates(prev => prev.map(t => 
            t.id === selectedTemplate.id 
              ? { ...t, ...editForm, updated_at: new Date().toISOString() }
              : t
          ));
          toast.success('Template updated locally (backend offline)');
        }
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedTemplate(null);
    } catch (error) {
      toast.error('Failed to save template');
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteTemplate = async (template: AgentTemplate) => {
    if (!template.is_custom) {
      toast.error('Cannot delete default templates');
      return;
    }

    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        try {
          const response = await fetch(`http://localhost:8000/api/agent-templates/${template.id}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            toast.success('Template deleted successfully');
            loadTemplates();
          } else {
            throw new Error('Server error');
          }
        } catch (error) {
          // Fallback to local handling
          setTemplates(prev => prev.filter(t => t.id !== template.id));
          toast.success('Template deleted locally (backend offline)');
        }
      } catch (error) {
        toast.error('Failed to delete template');
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleDuplicateTemplate = async (template: AgentTemplate) => {
    try {
      try {
        const response = await fetch(`http://localhost:8000/api/agent-templates/${template.id}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(`${template.name} (Copy)`)
        });

        if (response.ok) {
          toast.success('Template duplicated successfully');
          loadTemplates();
        } else {
          throw new Error('Server error');
        }
      } catch (error) {
        // Fallback to local handling
        const duplicatedTemplate = {
          ...template,
          id: `${template.id}_copy_${Date.now()}`,
          name: `${template.name} (Copy)`,
          is_custom: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setTemplates(prev => [...prev, duplicatedTemplate]);
        toast.success('Template duplicated locally (backend offline)');
      }
    } catch (error) {
      toast.error('Failed to duplicate template');
      console.error('Error duplicating template:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'custom' && template.is_custom) ||
                         (filterType === 'default' && !template.is_custom);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-cyan-900/10"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="neural-grid absolute inset-0"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text tracking-wider mb-3">
                NEURAL LAB
              </h1>
              <p className="text-gray-400 text-xl font-light">Design and customize your AI agent templates</p>
            </div>
            <button
              onClick={handleCreateTemplate}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center space-x-3 transform hover:scale-105 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="text-xl relative z-10">⚡</span>
              <span className="relative z-10 tracking-wider">CREATE AGENT</span>
            </button>
          </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search neural agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 backdrop-blur-sm"
            />
            <svg className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex glass-dark rounded-xl p-1">
            {[
              { value: 'all', label: 'ALL', icon: '🌐' },
              { value: 'default', label: 'CORE', icon: '⚡' },
              { value: 'custom', label: 'CUSTOM', icon: '🔬' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all duration-300 flex items-center space-x-2 ${
                  filterType === filter.value
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="glass-dark rounded-xl border border-purple-500/20 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 overflow-hidden transform hover:scale-105 group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl border border-purple-500/30 neural-glow"
                      style={{ backgroundColor: template.color + '20', color: template.color }}
                    >
                      {template.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg tracking-wide">{template.name}</h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold tracking-wider ${
                        template.is_custom 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {template.is_custom ? 'CUSTOM' : 'CORE'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all duration-300 group-hover:scale-110"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-300 group-hover:scale-110"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {template.is_custom && (
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 group-hover:scale-110"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">{template.description}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-400 font-medium tracking-wide uppercase">{template.type.replace('_', ' ')}</span>
                  <span className={`px-3 py-1 rounded-full font-bold tracking-wider ${
                    template.is_active 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {template.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Edit/Create Modal */}
        {(isEditing || isCreating) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-dark rounded-2xl max-w-4xl w-full max-h-screen overflow-y-auto border border-purple-500/30">
              <div className="p-6 border-b border-purple-500/20">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text tracking-wider">
                    {isCreating ? 'CREATE NEURAL AGENT' : `MODIFY ${selectedTemplate?.name?.toUpperCase()}`}
                  </h2>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                    }}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-cyan-400 mb-3 tracking-wider uppercase">Agent Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 backdrop-blur-sm"
                      placeholder="e.g., Security Analyst"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-cyan-400 mb-3 tracking-wider uppercase">Description</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 backdrop-blur-sm"
                      placeholder="Brief description of the agent's purpose"
                    />
                  </div>
                </div>

                {/* Icon and Color */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-cyan-400 mb-3 tracking-wider uppercase">Icon</label>
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="text"
                        value={editForm.icon}
                        onChange={(e) => setEditForm({...editForm, icon: e.target.value})}
                        className="w-20 px-3 py-3 bg-gray-900/50 border border-purple-500/30 rounded-xl text-center text-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                      />
                      <span className="text-purple-400 font-medium">or choose:</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {predefinedIcons.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setEditForm({...editForm, icon})}
                          className={`w-12 h-12 rounded-xl text-lg hover:bg-purple-500/20 transition-all duration-300 border ${
                            editForm.icon === icon 
                              ? 'bg-cyan-500/20 border-cyan-500 neural-glow scale-110' 
                              : 'border-purple-500/20 hover:border-purple-500/50'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-cyan-400 mb-3 tracking-wider uppercase">Color</label>
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                        className="w-12 h-10 border border-purple-500/30 rounded-xl bg-gray-900/50"
                      />
                      <input
                        type="text"
                        value={editForm.color}
                        onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                        className="flex-1 px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditForm({...editForm, color})}
                          className={`w-12 h-12 rounded-xl transition-all duration-300 border-2 ${
                            editForm.color === color 
                              ? 'border-cyan-400 scale-110 neural-glow' 
                              : 'border-purple-500/20 hover:border-purple-500/50'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-bold text-cyan-400 mb-3 tracking-wider uppercase">Neural Prompt</label>
                  <textarea
                    value={editForm.prompt}
                    onChange={(e) => setEditForm({...editForm, prompt: e.target.value})}
                    rows={12}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 resize-none backdrop-blur-sm"
                    placeholder="Define the agent's neural pathways, expertise domains, and cognitive response patterns..."
                  />
                  <p className="text-sm text-purple-400 mt-3 font-medium">
                    This neural prompt defines your agent's cognitive architecture and behavioral patterns. Be specific about expertise domains and response methodologies.
                  </p>
                </div>

                {/* Preview */}
                <div className="glass rounded-xl p-6 border border-cyan-500/20">
                  <h4 className="font-bold text-cyan-400 mb-4 tracking-wider uppercase">Neural Preview</h4>
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl border border-purple-500/30 neural-glow"
                      style={{ backgroundColor: editForm.color + '20', color: editForm.color }}
                    >
                      {editForm.icon}
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-lg tracking-wide">{editForm.name || 'Agent Name'}</h5>
                      <p className="text-sm text-gray-300">{editForm.description || 'Agent description'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-purple-500/20 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                  }}
                  className="px-8 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700/50 hover:text-white transition-all duration-300 font-medium tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!editForm.name || !editForm.prompt}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl hover:shadow-2xl hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold tracking-wider transform hover:scale-105"
                >
                  {isCreating ? 'CREATE AGENT' : 'SAVE CHANGES'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <div className="text-8xl mb-6 neural-pulse">🧠</div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-wider">NEURAL VOID DETECTED</h3>
            <p className="text-gray-400 mb-8 text-lg">
              {searchTerm ? 'No agents match your neural scan parameters' : 'Initialize your first neural agent template'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateTemplate}
                className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold tracking-wider hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
              >
                INITIALIZE FIRST AGENT
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentTemplateEditor;