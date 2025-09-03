/**
 * @file Desktop navigation links.
 * @coder Claude
 * @category Builder Block
 */
import React from 'react';
import { NavItemData } from '../../types/navigation';

interface DesktopNavProps {
  items: NavItemData[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ items, isActive, onNavigate }) => (
  <div className="hidden md:flex items-center space-x-1">
    {items.map((item) => (
      <button
        key={item.path}
        onClick={() => onNavigate(item.path)}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 relative overflow-hidden ${
          isActive(item.path)
            ? 'bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 text-cyan-400 border border-cyan-500/30'
            : 'text-gray-300 hover:text-white hover:bg-gray-800/50 border border-transparent'
        }`}
      >
        {isActive(item.path) && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse"></div>
        )}
        <span className="text-base relative z-10">{item.icon}</span>
        <span className="relative z-10 font-semibold tracking-wide">{item.label}</span>
      </button>
    ))}
  </div>
);
