/**
 * @file Renders the agent selection panel. (Dumb component)
 * @coder Gemini
 * @category Builder Block
 */
import React from 'react';

// Assuming AgentTemplate is a shared type
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
}

interface AgentSelectionPanelProps {
  availableTemplates: AgentTemplate[];
  selectedTemplates: string[];
  isSelectable: (id: string) => boolean;
  onTemplateToggle: (id: string) => void;
  onPresetSelect: (ids: string[]) => void;
}

export const AgentSelectionPanel: React.FC<AgentSelectionPanelProps> = ({ 
  availableTemplates, 
  selectedTemplates, 
  isSelectable, 
  onTemplateToggle, 
  onPresetSelect 
}) => {
  
  const handlePreset = (type: 'design' | 'tech' | 'business' | 'top5' | 'none') => {
    if (type === 'none') return onPresetSelect([]);
    if (type === 'top5') return onPresetSelect(availableTemplates.slice(0, 5).map(t => t.id));
    const preset = availableTemplates.filter(t => t.type.includes(type)).slice(0, 4).map(t => t.id);
    onPresetSelect(preset);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-xl text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
          NEURAL AGENTS ({selectedTemplates.length}/5)
        </h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handlePreset('design')} className="text-xs font-semibold px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30">DESIGN</button>
          <button onClick={() => handlePreset('tech')} className="text-xs font-semibold px-3 py-1 rounded bg-blue-500/10 border border-blue-500/30">TECH</button>
          <button onClick={() => handlePreset('business')} className="text-xs font-semibold px-3 py-1 rounded bg-green-500/10 border border-green-500/30">BUSINESS</button>
          <button onClick={() => handlePreset('top5')} className="text-xs font-semibold px-3 py-1 rounded bg-purple-500/10 border border-purple-500/30">TOP 5</button>
          <button onClick={() => handlePreset('none')} className="text-xs font-semibold px-3 py-1 rounded bg-gray-500/10 border border-gray-500/30">NONE</button>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {availableTemplates.map(template => {
          const isChecked = selectedTemplates.includes(template.id);
          const canSelect = isSelectable(template.id);
          const isDisabled = !isChecked && !canSelect;

          return (
            <label
              key={template.id}
              className={`flex items-center p-4 border rounded-xl transition-all duration-300 backdrop-blur-sm group ${
                isDisabled
                  ? 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                  : isChecked
                  ? 'border-cyan-500/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 shadow-lg'
                  : 'border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => onTemplateToggle(template.id)}
                className="mr-4 w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500"
              />
              <div style={{ backgroundColor: template.color + '20', color: template.color }} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mr-4 group-hover:scale-110 transition-transform">
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate">{template.name}</div>
                <div className="text-xs text-gray-400 truncate">{template.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};