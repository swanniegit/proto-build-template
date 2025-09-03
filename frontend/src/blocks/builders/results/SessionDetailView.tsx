/**
 * @file Displays the detailed view of a selected session.
 * @coder Gemini
 * @category Builder Block
 */
import React from 'react';
import { AgentResultCard } from './AgentResultCard';

// Assuming HistorySession is moved to a central types file
interface HistorySession {
  id: string; title: string; user_input: string; agent_count: number;
  avg_confidence: number; total_time: number; timestamp: string;
  results: any[]; // Use specific type
}

interface SessionDetailViewProps {
  session: HistorySession;
  onClose: () => void;
  onExport: (session: HistorySession, format: 'json' | 'csv' | 'pdf') => void;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({ session, onClose, onExport }) => (
  <div className="w-96 glass-dark rounded-2xl border border-cyan-500/30 p-8 h-fit sticky top-8">
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-black text-2xl text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text tracking-wider">NEURAL DETAILS</h3>
      <div className="flex items-center space-x-2">
        <button onClick={() => onExport(session, 'json')} className="p-3 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl" title="Export as JSON">
          {/* SVG Icon */}
        </button>
        <button onClick={onClose} className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl">
          {/* SVG Icon */}
        </button>
      </div>
    </div>
    <div className="space-y-6">
      <div>
        <h4 className="font-bold text-cyan-400 mb-3 tracking-wider uppercase">Original Neural Query</h4>
        <p className="text-gray-300 glass rounded-xl p-4 leading-relaxed backdrop-blur-sm">{session.user_input}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Stats */}
      </div>
      <div>
        <h4 className="font-bold text-cyan-400 mb-4 tracking-wider uppercase flex items-center">🧠 Neural Agent Results</h4>
        <div className="space-y-4 max-h-72 overflow-y-auto">
          {session.results.map((result, index) => <AgentResultCard key={index} result={result} />)}
        </div>
      </div>
    </div>
  </div>
);
