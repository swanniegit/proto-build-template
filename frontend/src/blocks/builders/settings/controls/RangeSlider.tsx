/**
 * @file Reusable RangeSlider component.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({ value, onChange, min = 0, max = 1, step = 0.1 }) => {
  const numValue = value || 0;
  const percentage = ((numValue - min) / (max - min)) * 100;

  return (
    <div className="flex items-center space-x-4">
      <input
        type="range"
        value={numValue}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #06b6d4 0%, #8b5cf6 ${percentage}%, #374151 ${percentage}%, #374151 100%)`
        }}
      />
      <span className="text-cyan-400 font-bold w-16 text-right tracking-wider">
        {(numValue * 100).toFixed(0)}%
      </span>
    </div>
  );
};
