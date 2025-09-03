/**
 * @file Abstraction layer for LocalStorage operations for guest users.
 * @coder Claude
 * @category Bridge Block
 */
import { UserPreferences } from '../types/settings';

const PREFERENCES_KEY = 'userPreferences_guest'; // Clarify key for guests

const getDefaults = (): UserPreferences => ({
  theme: 'dark',
  defaultAgents: [],
  autoSave: true,
  exportFormat: 'json',
  notifications: true,
  maxResults: 50,
  confidenceThreshold: 0.6,
  llmProvider: 'openai',
  llmModel: 'gpt-4o-mini',
  llmTemperature: 0.7
});

export const guestPreferencesStorage = {
  load: (): UserPreferences => {
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        return { ...getDefaults(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to parse guest preferences from localStorage', error);
    }
    return getDefaults();
  },

  save: (prefs: UserPreferences): void => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save guest preferences to localStorage', error);
    }
  },

  reset: (): UserPreferences => {
    const defaults = getDefaults();
    // The useSettings hook is responsible for saving after a reset.
    // This prevents circular dependency issues.
    return defaults;
  },

  purge: (): void => {
    try {
      localStorage.removeItem(PREFERENCES_KEY);
    } catch (error) {
      console.error('Failed to purge guest preferences', error);
    }
  }
};

export const DEFAULT_PREFERENCES = getDefaults();