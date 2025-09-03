/**
 * @file User profile button for the navigation bar.
 * @coder Claude
 * @category Builder Block
 */
import React from 'react';
import { User } from '../../types/auth';

interface UserButtonProps {
  user: User | null;
  onClick: () => void;
}

export const UserButton: React.FC<UserButtonProps> = ({ user, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center space-x-2 px-3 py-2 text-cyan-300 hover:text-cyan-100 hover:bg-gray-800/50 rounded-lg transition-all duration-300"
  >
    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-black text-sm font-black">
      {user?.username.charAt(0).toUpperCase() || 'U'}
    </div>
    <span className="text-sm font-medium">{user?.username}</span>
  </button>
);