/**
 * @file Displays a single session item in the history list.
 * @coder Gemini
 * @category Builder Block
 */
import React from 'react';

// Assuming HistorySession is moved to a central types file
interface HistorySession {
  id: string; title: string; user_input: string; agent_count: number;
  avg_confidence: number; total_time: number; timestamp: string;
}

interface SessionListItemProps {
  session: HistorySession;
  isSelected: boolean;
  onSelect: (session: HistorySession) => void;
  onDelete: (sessionId: string) => void;
}

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.8) return { label: 'OPTIMAL', color: 'bg-gradient-to-r from-green-500 to-emerald-500', glow: 'shadow-green-500/25' };
  if (confidence >= 0.6) return { label: 'STABLE', color: 'bg-gradient-to-r from-yellow-500 to-orange-500', glow: 'shadow-yellow-500/25' };
  return { label: 'UNSTABLE', color: 'bg-gradient-to-r from-red-500 to-pink-500', glow: 'shadow-red-500/25' };
};

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const SessionListItem: React.FC<SessionListItemProps> = ({ session, isSelected, onSelect, onDelete }) => {
  const confidenceBadge = getConfidenceBadge(session.avg_confidence);

  return (
    <div
      className={`glass-dark rounded-2xl border p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl transform hover:scale-[1.02] group ${
        isSelected ? 'border-cyan-500 shadow-cyan-500/20 neural-glow' : 'border-purple-500/20 hover:border-cyan-500/40'
      }`}
      onClick={() => onSelect(session)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-white text-xl mb-2 tracking-wide group-hover:text-cyan-300 transition-colors duration-300">{session.title}</h3>
          <p className="text-gray-300 leading-relaxed line-clamp-2">{session.user_input}</p>
        </div>
        <div className="flex items-center space-x-3 ml-6">
          <span className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wider ${confidenceBadge.color} text-white shadow-lg ${confidenceBadge.glow}`}>
            {confidenceBadge.label}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(session.id); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl" title="Delete session">
            {/* SVG Icon */}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          <span className="text-cyan-400 font-medium flex items-center"><span className="mr-2">🤖</span>{session.agent_count} agents</span>
          <span className="text-purple-400 font-medium flex items-center"><span className="mr-2">🎯</span>{(session.avg_confidence * 100).toFixed(0)}% confidence</span>
          <span className="text-blue-400 font-medium flex items-center"><span className="mr-2">⚡</span>{session.total_time.toFixed(1)}s processing</span>
        </div>
        <span className="text-gray-400 font-mono tracking-wider">{formatDate(session.timestamp)}</span>
      </div>
    </div>
  );
};
