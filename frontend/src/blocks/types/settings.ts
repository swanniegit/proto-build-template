/**
 * @file Defines the type interfaces for the Settings component blocks.
 * @coder Gemini
 */

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  defaultAgents: string[];
  autoSave: boolean;
  exportFormat: 'json' | 'pdf' | 'markdown';
  notifications: boolean;
  maxResults: number;
  confidenceThreshold: number;
  llmProvider: string;
  llmModel: string;
  llmTemperature: number;
  notificationEmail?: string;
  teamsWebhookUrl?: string;
}

export interface Agent {
  id: string;
  name: string;
  icon: string;
}

export interface LLMProvider {
  available: boolean;
  models: string[];
  reason?: string;
}

export interface LLMProviders {
  [key: string]: LLMProvider;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface AvailableLLMs {
  providers: LLMProviders;
  models: LLMModel[];
}

export type SettingType = 'toggle' | 'select' | 'multiselect' | 'number' | 'range' | 'text';

export interface SettingOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
}

export interface Setting {
  key: keyof UserPreferences;
  label: string;
  type: SettingType;
  description: string;
  options?: SettingOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface SettingSectionData {
  id: string;
  title: string;
  icon: string;
  settings: Setting[];
  customContentId?: string;
}
