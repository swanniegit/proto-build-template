/**
 * @file Logo component for the navigation bar.
 * @coder Claude
 * @category Builder Block
 */
import React from 'react';

interface LogoProps {
  onClick: () => void;
}

export const Logo: React.FC<LogoProps> = ({ onClick }) => (
  <div className="flex items-center">
    <button
      onClick={onClick}
      className="flex items-center space-x-3 font-bold text-xl text-white hover:text-cyan-400 transition-colors group"
    >
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-lg flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform duration-300 shadow-lg">
        🧠
      </div>
      <span className="font-black tracking-wider">NEURAL</span>
    </button>
  </div>
);
