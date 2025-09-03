/**
 * @file Abstraction layer for settings-related API endpoints.
 * @coder Claude
 * @category Bridge Block
 */
import { Agent, AvailableLLMs } from '../types/settings';

const API_BASE_URL = 'http://localhost:8000';

// Mock data as a fallback
const MOCK_AGENTS: Agent[] = [
  { id: 'ui_designer', name: 'UI Designer', icon: '🎨' },
  { id: 'ux_researcher', name: 'UX Researcher', icon: '👥' },
  { id: 'developer', name: 'Developer', icon: '💻' },
  { id: 'product_manager', name: 'Product Manager', icon: '📊' },
  { id: 'stakeholder', name: 'Stakeholder', icon: '🏢' }
];

const MOCK_LLMS: AvailableLLMs = {
  providers: {
    openai: { available: true, models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
    deepseek: { available: false, reason: 'API key not configured', models: [] },
    kimi: { available: false, reason: 'API key not configured', models: [] }
  },
  models: [
    { id: 'gpt-4o', name: 'GPT-4o (Latest)', provider: 'openai', description: 'Most capable model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast and affordable' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', description: 'Legacy model' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', description: 'DeepSeek flagship model' },
    { id: 'moonshot-v1-8k', name: 'Kimi 8K', provider: 'kimi', description: 'Kimi standard model' }
  ]
};

export const settingsApi = {
  fetchAvailableAgents: async (): Promise<Agent[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agent-templates/active`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const agents = await response.json();
      return agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        icon: agent.icon
      }));
    } catch (error) {
      console.warn('Backend not available, using mock agents:', error);
      return MOCK_AGENTS;
    }
  },

  fetchAvailableLLMs: async (): Promise<AvailableLLMs> => {
    try {
      const [providersRes, modelsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/llm/providers`),
        fetch(`${API_BASE_URL}/api/llm/models`)
      ]);
      if (!providersRes.ok || !modelsRes.ok) throw new Error('Failed to load LLM data');
      const providers = await providersRes.json();
      const models = await modelsRes.json();
      return { providers: providers.providers, models: models.models };
    } catch (error) {
      console.warn('Backend not available, using mock LLM data:', error);
      return MOCK_LLMS;
    }
  },

  runNeuralDiagnostic: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/llm/test`);
    if (!response.ok) throw new Error('Neural test failed - backend connection issue');
    return response.json();
  }
};
