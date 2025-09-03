/**
 * @file The main controller hook for the settings page.
 * @coder Gemini
 * @category Controller/Utility Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { UserPreferences, Agent, AvailableLLMs, Setting } from '../../types/settings';
import { guestPreferencesStorage, DEFAULT_PREFERENCES } from '../../bridges/guestPreferencesStorage';
import { settingsApi } from '../../bridges/settingsApi';
import { useAuth } from '../../providers/AuthProvider';

export const useSettings = () => {
  const { user, updateProfile, logout } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [availableLLMs, setAvailableLLMs] = useState<AvailableLLMs>({ providers: {}, models: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Effect to sync preferences from user object or load from storage
  useEffect(() => {
    if (user) {
      // For logged-in users: try localStorage first, then user profile, then defaults
      const storedPrefs = localStorage.getItem('userPreferences');
      if (storedPrefs) {
        try {
          const parsed = JSON.parse(storedPrefs);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
          console.log('📋 Loaded user preferences from localStorage:', parsed);
        } catch (error) {
          console.error('Failed to parse user preferences from localStorage:', error);
          setPreferences({ ...DEFAULT_PREFERENCES, ...user.preferences });
        }
      } else {
        // Fallback to user profile preferences or defaults
        setPreferences({ ...DEFAULT_PREFERENCES, ...user.preferences });
        console.log('📋 Loaded user preferences from profile:', user.preferences);
      }
    } else {
      setPreferences(guestPreferencesStorage.load());
    }
  }, [user]);

  // Effect to load dynamic data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        settingsApi.fetchAvailableAgents().then(setAvailableAgents),
        settingsApi.fetchAvailableLLMs().then(setAvailableLLMs)
      ]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handlePreferenceChange = useCallback((key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const savePreferences = useCallback(async () => {
    setIsSaving(true);
    try {
      if (user) {
        // For logged-in users, save to localStorage as a backup since API might not be implemented
        const storageKey = 'userPreferences';
        localStorage.setItem(storageKey, JSON.stringify(preferences));
        console.log('✅ Saved user preferences to localStorage:', preferences);
        
        // Try to save to profile API, but don't fail if it doesn't work
        try {
          await updateProfile({ preferences });
          toast.success('Preferences saved to your profile');
        } catch (apiError) {
          console.warn('Profile API update failed, using localStorage backup:', apiError);
          toast.success('Preferences saved locally');
        }
      } else {
        guestPreferencesStorage.save(preferences);
        toast.success('Guest preferences saved');
      }
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Save settings error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, preferences, updateProfile]);

  const resetToDefaults = useCallback(async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setPreferences(DEFAULT_PREFERENCES);
      if (user) {
        await updateProfile({ preferences: DEFAULT_PREFERENCES });
        toast.success('Profile preferences reset to defaults');
      } else {
        guestPreferencesStorage.save(DEFAULT_PREFERENCES);
        toast.success('Guest preferences reset to defaults');
      }
    }
  }, [user, updateProfile]);

  const purgeAllData = useCallback(() => {
    if (confirm('This will clear all local data and log you out. This action cannot be undone. Continue?')) {
      guestPreferencesStorage.purge();
      if (user) {
        logout();
      }
      setPreferences(DEFAULT_PREFERENCES);
      toast.success('All local data cleared');
    }
  }, [user, logout]);

  const getSettingWithOptions = useCallback((setting: Setting): Setting => {
    if (setting.key === 'defaultAgents') {
      return { ...setting, options: availableAgents.map(a => ({ value: a.id, label: a.name, icon: a.icon })) };
    }
    if (setting.key === 'llmProvider') {
      return { ...setting, options: Object.entries(availableLLMs.providers).map(([k, p]) => ({ value: k, label: k, disabled: !p.available })) };
    }
    if (setting.key === 'llmModel') {
      return { ...setting, options: availableLLMs.models.filter(m => m.provider === preferences.llmProvider).map(m => ({ value: m.id, label: m.name, description: m.description })) };
    }
    return setting;
  }, [availableAgents, availableLLMs, preferences.llmProvider]);

  return {
    preferences,
    isLoading,
    isSaving,
    handlePreferenceChange,
    savePreferences,
    resetToDefaults,
    purgeAllData,
    getSettingWithOptions,
    // For custom UI components
    availableLLMs,
    runNeuralTest: settingsApi.runNeuralDiagnostic,
  };
};
