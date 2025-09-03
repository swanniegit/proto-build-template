/**
 * @file Floating save button for the settings page.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface FloatingSaveButtonProps {
  onSave: () => void;
  isLoading: boolean;
}

export const FloatingSaveButton: React.FC<FloatingSaveButtonProps> = ({ onSave, isLoading }) => (
  <div className="fixed bottom-8 right-8 z-20">
    <button
      onClick={onSave}
      disabled={isLoading}
      className={`px-10 py-4 rounded-2xl font-black tracking-wider shadow-2xl transition-all duration-300 transform ${
        isLoading
          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
          : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 text-white hover:shadow-cyan-500/25 hover:scale-110 neural-glow'
      }`}
    >
      {isLoading ? (
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span>SYNCHRONIZING...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <span>💾</span>
          <span>SAVE NEURAL CONFIG</span>
        </div>
      )}
    </button>
  </div>
);
