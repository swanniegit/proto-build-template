/**
 * @file UI component for share buttons.
 * @coder Gemini
 * @category Builder Block
 */
import React from 'react';

interface ShareButtonsProps {
  onShareEmail: () => void;
  onShareTeams: () => void;
  // We can add more props to disable buttons if config is missing
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ onShareEmail, onShareTeams }) => (
  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-purple-500/10">
    <span className="text-xs text-gray-400 font-medium">Share:</span>
    <button 
      onClick={onShareEmail}
      title="Share to Email"
      className="px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-colors"
    >
      📧 Email
    </button>
    <button 
      onClick={onShareTeams}
      title="Share to Teams"
      className="px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/10 rounded-md transition-colors"
    >
      💬 Teams
    </button>
  </div>
);
