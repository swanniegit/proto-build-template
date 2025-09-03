/**
 * @file Composition root for the Settings page.
 * @coder Gemini
 * @category Composition Root
 */
import React from 'react';
import { useSettings } from '../blocks/utilities/hooks/useSettings';
import { SETTINGS_SECTIONS } from '../blocks/constants/settings';
import { AvailableLLMs } from '../blocks/types/settings';

// Import all builder blocks
import { SettingsBackground } from '../blocks/builders/settings/SettingsBackground';
import { SettingsHeader } from '../blocks/builders/settings/SettingsHeader';
import { SettingsSection } from '../blocks/builders/settings/SettingsSection';
import { ProviderStatusGrid } from '../blocks/builders/settings/ProviderStatusGrid';
import { ModelSummary } from '../blocks/builders/settings/ModelSummary';
import { NeuralDiagnosticButton } from '../blocks/builders/settings/NeuralDiagnosticButton';
import { DataManagementActions } from '../blocks/builders/settings/DataManagementActions';
import { FloatingSaveButton } from '../blocks/builders/settings/FloatingSaveButton';

// This is now a pure UI component that receives data and callbacks.
const AiStatusContent = ({ llms, onRunTest }: { llms: AvailableLLMs, onRunTest: () => void }) => {
  return (
    <div className="space-y-6">
      <ProviderStatusGrid llms={llms} />
      <ModelSummary llms={llms} />
      <NeuralDiagnosticButton onClick={onRunTest} />
    </div>
  );
};

const Settings: React.FC = () => {
  const {
    preferences,
    isSaving,
    handlePreferenceChange,
    savePreferences,
    resetToDefaults,
    purgeAllData,
    getSettingWithOptions,
    availableLLMs, // Get the data here
    runNeuralTest, // Get the callback here
  } = useSettings();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <SettingsBackground />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <SettingsHeader />
        <div className="space-y-8">
          {SETTINGS_SECTIONS.map((section) => (
            <SettingsSection
              key={section.id}
              section={section}
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
              getSettingWithOptions={getSettingWithOptions}
              customContent={section.customContentId === 'aiStatusContent' 
                ? <AiStatusContent llms={availableLLMs} onRunTest={runNeuralTest} /> 
                : undefined
              }
            />
          ))}
          <DataManagementActions onReset={resetToDefaults} onPurge={purgeAllData} />
        </div>
        <FloatingSaveButton onSave={savePreferences} isLoading={isSaving} />
      </div>
    </div>
  );
};

export default Settings;
