/**
 * @file Renders a full section of the settings page.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { SettingSectionData, UserPreferences, Setting } from '../../types/settings';
import { SettingRow } from './SettingRow';

interface SettingsSectionProps {
  section: SettingSectionData;
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: any) => void;
  getSettingWithOptions: (setting: Setting) => Setting;
  customContent?: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ section, preferences, onPreferenceChange, getSettingWithOptions, customContent }) => (
  <div className="glass-dark rounded-2xl border border-purple-500/20 overflow-hidden hover:border-cyan-500/40 transition-all duration-500 group">
    <div className="px-8 py-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-cyan-900/20">
      <h2 className="text-2xl font-bold text-white flex items-center tracking-wider group-hover:text-cyan-300 transition-colors duration-300">
        <span className="text-3xl mr-4 neural-pulse">{section.icon}</span>
        {section.title.toUpperCase()}
      </h2>
    </div>
    <div className="p-8 space-y-8">
      {customContent ? customContent : section.settings.map(setting => (
        <SettingRow 
          key={setting.key} 
          setting={getSettingWithOptions(setting)} 
          preferences={preferences} 
          onPreferenceChange={onPreferenceChange} 
        />
      ))}
    </div>
  </div>
);
