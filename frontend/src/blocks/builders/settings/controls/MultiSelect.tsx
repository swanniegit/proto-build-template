/**
 * @file Reusable MultiSelect component.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { SettingOption } from '../../../types/settings';

interface MultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: SettingOption[];
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ values, onChange, options }) => (
  <div className="space-y-3 max-h-48 overflow-y-auto glass rounded-xl p-4 border border-purple-500/20">
    {options.map((option) => (
      <label key={option.value} className="flex items-center cursor-pointer group hover:bg-purple-500/10 rounded-lg p-2 transition-all duration-300">
        <input
          type="checkbox"
          checked={values.includes(option.value)}
          onChange={(e) => {
            if (e.target.checked) {
              onChange([...values, option.value]);
            } else {
              onChange(values.filter(v => v !== option.value));
            }
          }}
          className="w-5 h-5 rounded border-2 border-purple-500/50 text-cyan-500 focus:ring-2 focus:ring-cyan-500/20 mr-3 bg-transparent"
        />
        <span className="text-xl mr-3">{option.icon}</span>
        <span className="text-white font-medium group-hover:text-cyan-300 transition-colors duration-300">{option.label}</span>
      </label>
    ))}
  </div>
);
