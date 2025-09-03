/**
 * @file Reusable Select component.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { SettingOption } from '../../../types/settings';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SettingOption[];
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options }) => (
  <select
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    className="block w-full bg-gray-900/70 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value} className="bg-gray-900 text-white" disabled={option.disabled}>
        {option.label}
      </option>
    ))}
  </select>
);
