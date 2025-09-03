/**
 * @file Mobile navigation menu.
 * @coder Claude
 * @category Builder Block
 */
import React from 'react';
import { NavItemData } from '../../types/navigation';

interface MobileNavProps {
  items: NavItemData[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ items, isActive, onNavigate }) => (
  <div className="md:hidden py-4 border-t border-gray-800 bg-black/95 backdrop-blur-sm">
    <div className="flex flex-col space-y-2">
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => onNavigate(item.path)}
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
            isActive(item.path)
              ? 'bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="font-semibold tracking-wide">{item.label}</span>
        </button>
      ))}
    </div>
  </div>
);
