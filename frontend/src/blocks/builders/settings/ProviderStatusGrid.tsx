/**
 * @file Renders a grid showing the status of AI providers.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { AvailableLLMs } from '../../types/settings';

interface ProviderStatusGridProps {
  llms: AvailableLLMs;
}

export const ProviderStatusGrid: React.FC<ProviderStatusGridProps> = ({ llms }) => (
  <div>
    <h3 className="text-lg font-bold text-cyan-300 mb-4 tracking-wide">Neural Provider Status</h3>
    <div className="grid grid-cols-3 gap-4">
      {['openai', 'deepseek', 'kimi'].map(provider => {
        const isAvailable = llms.providers[provider]?.available;
        return (
          <div 
            key={provider}
            className={`p-4 rounded-xl text-center transition-all duration-300 ${
              isAvailable
                ? 'bg-green-900/30 border border-green-500/40 text-green-300 shadow-lg shadow-green-500/10'
                : 'bg-red-900/30 border border-red-500/40 text-red-300 shadow-lg shadow-red-500/10'
            }`}
          >
            <div className="text-2xl mb-2">
              {provider === 'openai' && '🔴'}
              {provider === 'deepseek' && '🟦'}
              {provider === 'kimi' && '🟣'}
            </div>
            <div className="font-bold uppercase tracking-wider text-sm">
              {provider}
            </div>
            <div className="text-xs mt-1 opacity-75">
              {isAvailable ? 'ONLINE' : 'OFFLINE'}
            </div>
            {!isAvailable && (
              <div className="text-xs mt-1 text-yellow-400">
                {llms.providers[provider]?.reason || 'API Key Required'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
