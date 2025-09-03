/**
 * @file Reusable Toggle component.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
    <div className={`w-14 h-8 rounded-full border-2 transition-all duration-300 ${
      checked ? 'bg-gradient-to-r from-cyan-500 to-purple-500 border-cyan-500' : 'bg-gray-700 border-gray-600'
    }`}>
      <div className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 mt-0.5 ${
        checked ? 'translate-x-6' : 'translate-x-0.5'
      }`}></div>
    </div>
  </label>
);
