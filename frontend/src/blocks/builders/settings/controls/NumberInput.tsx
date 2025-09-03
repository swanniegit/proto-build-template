/**
 * @file Reusable NumberInput component.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min, max }) => (
  <input
    type="number"
    value={value || 0}
    min={min}
    max={max}
    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
    className="block w-full bg-gray-900/70 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
  />
);
