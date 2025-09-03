/**
 * @file Defines the structure of the settings page.
 * @coder Gemini
 */
import { SettingSectionData } from '../types/settings';

export const SETTINGS_SECTIONS: SettingSectionData[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    icon: '🎨',
    settings: [
      {
        key: 'theme',
        label: 'Theme',
        type: 'select',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto (System)' }
        ],
        description: 'Choose your preferred color theme'
      }
    ]
  },
  {
    id: 'defaultAgents',
    title: 'Default Agents',
    icon: '🤖',
    settings: [
      {
        key: 'defaultAgents',
        label: 'Pre-selected Agents',
        type: 'multiselect',
        // Options are populated dynamically
        description: 'Agents that will be selected by default in new sessions'
      }
    ]
  },
  {
    id: 'neuralEngine',
    title: 'AI Neural Engine',
    icon: '🧠',
    settings: [
      {
        key: 'llmProvider',
        label: 'AI Provider',
        type: 'select',
        // Options are populated dynamically
        description: 'Choose your preferred AI provider'
      },
      {
        key: 'llmModel',
        label: 'Neural Model',
        type: 'select',
        // Options are populated dynamically
        description: 'Select the specific AI model to use'
      },
      {
        key: 'llmTemperature',
        label: 'Creativity Level',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Control randomness: 0 = focused, 1 = creative'
      }
    ]
  },
  {
    id: 'aiStatus',
    title: 'AI Status & Testing',
    icon: '🔬',
    settings: [],
    customContentId: 'aiStatusContent' // Identifier for custom JSX
  },
  {
    id: 'sessionBehavior',
    title: 'Session Behavior',
    icon: '⚙️',
    settings: [
      {
        key: 'autoSave',
        label: 'Auto-save sessions',
        type: 'toggle',
        description: 'Automatically save session results'
      },
      {
        key: 'maxResults',
        label: 'Max results to display',
        type: 'number',
        min: 10,
        max: 100,
        description: 'Maximum number of results to show in history'
      },
      {
        key: 'confidenceThreshold',
        label: 'Confidence threshold',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Minimum confidence level to highlight results'
      }
    ]
  },
  {
    id: 'export',
    title: 'Export & Sharing',
    icon: '📤',
    settings: [
      {
        key: 'exportFormat',
        label: 'Default export format',
        type: 'select',
        options: [
          { value: 'json', label: 'JSON' },
          { value: 'pdf', label: 'PDF' },
          { value: 'markdown', label: 'Markdown' }
        ],
        description: 'Default format for exporting results'
      }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: '🔌',
    settings: [
      {
        key: 'notificationEmail',
        label: 'Email Address for Notifications',
        type: 'text',
        description: 'The email address where you want to receive results.'
      },
      {
        key: 'teamsWebhookUrl',
        label: 'Microsoft Teams Webhook URL',
        type: 'text',
        description: 'The incoming webhook URL for the Teams channel.'
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: '🔔',
    settings: [
      {
        key: 'notifications',
        label: 'Enable notifications',
        type: 'toggle',
        description: 'Show toast notifications for actions and updates'
      }
    ]
  }
];
