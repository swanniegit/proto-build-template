/**
 * @file Login button for the navigation bar.
 * @coder Claude
 * @category Builder Block
 */
import React from 'react';

interface LoginButtonProps {
  onClick: () => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="px-4 py-2 text-cyan-300 hover:text-cyan-100 hover:bg-gray-800/50 rounded-lg transition-all duration-300 border border-cyan-400/30 hover:border-cyan-400/50"
  >
    Login
  </button>
);
