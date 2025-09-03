/**
 * @file Renders a summary of available AI models.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { AvailableLLMs } from '../../types/settings';

interface ModelSummaryProps {
  llms: AvailableLLMs;
}

export const ModelSummary: React.FC<ModelSummaryProps> = ({ llms }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="glass rounded-xl p-4 border border-purple-500/20">
      <div className="text-cyan-300 text-sm font-semibold tracking-wide mb-1">AVAILABLE MODELS</div>
      <div className="text-3xl font-black text-white">{llms.models.length}</div>
    </div>
    <div className="glass rounded-xl p-4 border border-purple-500/20">
      <div className="text-cyan-300 text-sm font-semibold tracking-wide mb-1">ACTIVE PROVIDERS</div>
      <div className="text-3xl font-black text-white">
        {Object.values(llms.providers).filter(p => p.available).length}
      </div>
    </div>
  </div>
);
