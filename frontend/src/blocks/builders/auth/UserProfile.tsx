/**
 * @file User profile modal, refactored.
 * @coder Cursor AI
 * @category Builder Block
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { User } from '../../types/auth';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileDisplay = ({ user, onEdit }: { user: User, onEdit: () => void }) => (
  <div className="space-y-4">
    <p><strong>Username:</strong> {user.username}</p>
    <p><strong>Full Name:</strong> {user.full_name || 'Not set'}</p>
    <p><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
    <p><strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
    <button onClick={onEdit} className="px-4 py-2 border border-cyan-400/30 text-cyan-300 rounded-md hover:border-cyan-400 hover:text-cyan-200 transition-colors">Edit Profile</button>
  </div>
);

const UserProfileEditor = ({ user, onSave, onCancel }: { user: User, onSave: (data: Partial<User>) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({ username: user.username, full_name: user.full_name || '' });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({...p, [e.target.name]: e.target.value}));

  return (
    <div className="space-y-4">
      <input name="username" value={formData.username} onChange={handleChange} className="w-full px-3 py-2 bg-black/50 border border-cyan-400/30 rounded-md text-cyan-100" />
      <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-3 py-2 bg-black/50 border border-cyan-400/30 rounded-md text-cyan-100" />
      <div className="flex space-x-3">
        <button onClick={() => onSave(formData)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-md">Save Changes</button>
        <button onClick={onCancel} className="px-4 py-2 border border-cyan-400/30 text-cyan-300 rounded-md">Cancel</button>
      </div>
    </div>
  );
};

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { if (isOpen) setIsEditing(false) }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async (updates: Partial<User>) => {
    await updateProfile(updates);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg mx-4 bg-black/90 border border-cyan-400/30 rounded-lg p-6">
        <button onClick={onClose} className="absolute top-4 right-4 w-6 h-6 text-cyan-400">X</button>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-cyan-400">User Profile</h2>
            <p className="text-cyan-200/70">{user.email}</p>
          </div>
        </div>
        {isEditing ? <UserProfileEditor user={user} onSave={handleSave} onCancel={() => setIsEditing(false)} /> : <UserProfileDisplay user={user} onEdit={() => setIsEditing(true)} />}
        <div className="mt-6 pt-6 border-t border-cyan-400/20 flex justify-end">
          <button 
            onClick={() => {
              logout();
              onClose(); // Close modal immediately when logout is clicked
            }} 
            className="px-4 py-2 bg-red-600/20 border border-red-400/30 text-red-400 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
