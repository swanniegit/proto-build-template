/**
 * @file Displays a single agent result card in the session detail view.
 * @coder Gemini
 * @category Builder Block
 */
import React from 'react';
import { useShareActions } from '../../utilities/hooks/useShareActions';
import { ShareButtons } from './ShareButtons';

// Assuming AgentResult is moved to a central types file, for now defined locally
interface AgentResult {
  template_id: string;
  agent_name: string;
  content: string;
  confidence_level: number;
  execution_time: number;
  suggestions: string[];
  questions: string[];
}

interface AgentResultCardProps {
  result: AgentResult;
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-300 bg-green-500/20 border border-green-500/30';
  if (confidence >= 0.6) return 'text-yellow-300 bg-yellow-500/20 border border-yellow-500/30';
  return 'text-red-300 bg-red-500/20 border border-red-500/30';
};

export const AgentResultCard: React.FC<AgentResultCardProps> = ({ result }) => {
  const { canShare, handleShareByEmail, handleShareToTeams } = useShareActions();

  return (
    <div className="glass-dark rounded-xl p-4 border border-purple-500/20 hover:border-cyan-500/40 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-bold text-white">{result.agent_name}</h5>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider ${getConfidenceColor(result.confidence_level)}`}>
          {(result.confidence_level * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed mb-3">{result.content}</p>
      {(result.suggestions.length > 0 || result.questions.length > 0) && (
        <div className="flex items-center space-x-4 text-xs">
          {result.suggestions.length > 0 && (
            <span className="text-yellow-400 font-medium flex items-center">
              <span className="mr-1">💡</span>{result.suggestions.length} insights
            </span>
          )}
          {result.questions.length > 0 && (
            <span className="text-blue-400 font-medium flex items-center">
              <span className="mr-1">❓</span>{result.questions.length} queries
            </span>
          )}
        </div>
      )}
      {canShare && (
        <ShareButtons 
          onShareEmail={() => handleShareByEmail(result)} 
          onShareTeams={() => handleShareToTeams(result)} 
        />
      )}
    </div>
  );
};