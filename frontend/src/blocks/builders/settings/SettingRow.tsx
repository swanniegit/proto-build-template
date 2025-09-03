/**
 * @file Renders a single row in a settings section.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { Setting, UserPreferences } from '../../types/settings';
import { Toggle } from './controls/Toggle';
import { Select } from './controls/Select';
import { MultiSelect } from './controls/MultiSelect';
import { NumberInput } from './controls/NumberInput';
import { RangeSlider } from './controls/RangeSlider';

interface SettingRowProps {
  setting: Setting;
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: any) => void;
}

const renderSettingControl = (setting: Setting, preferences: UserPreferences, onPreferenceChange: Function) => {
  const { key, type, options = [], min, max, step } = setting;
  const value = preferences[key];

  switch (type) {
    case 'toggle':
      return <Toggle checked={value as boolean} onChange={(v) => onPreferenceChange(key, v)} />;
    case 'select':
      return <Select value={value as string} onChange={(v) => onPreferenceChange(key, v)} options={options} />;
    case 'multiselect':
      return <MultiSelect values={value as string[]} onChange={(v) => onPreferenceChange(key, v)} options={options} />;
    case 'number':
      return <NumberInput value={value as number} onChange={(v) => onPreferenceChange(key, v)} min={min} max={max} />;
    case 'range':
      return <RangeSlider value={value as number} onChange={(v) => onPreferenceChange(key, v)} min={min} max={max} step={step} />;
    default:
      return <input type="text" value={value as string} onChange={(e) => onPreferenceChange(key, e.target.value)} />;
  }
};

export const SettingRow: React.FC<SettingRowProps> = ({ setting, preferences, onPreferenceChange }) => (
  <div className="flex items-start justify-between border-b border-gray-800/50 pb-6 last:border-b-0 last:pb-0">
    <div className="flex-1 mr-8">
      <h3 className="text-lg font-bold text-cyan-300 mb-2 tracking-wide">
        {setting.label}
      </h3>
      <p className="text-gray-400 leading-relaxed">
        {setting.description}
      </p>
    </div>
    <div className="flex-shrink-0 w-80">
      {renderSettingControl(setting, preferences, onPreferenceChange)}
    </div>
  </div>
);
