import { useState, useEffect, useCallback } from 'react';

interface WorkspaceState {
  currentRequest: string;
  agentResponses: any[];
  importedDocs: Array<{name: string, content: string, type: string}>;
  agentConversations: Record<string, Array<{role: 'user' | 'agent', content: string, timestamp: Date}>>;
  prdDocument: string | null;
  designDocument: string | null;
  showInsights: boolean;
  showReferences: boolean;
  showConfidence: boolean;
  showQuestions: boolean;
  synthesisView: boolean;
  activeTab: 'all' | 'ui_designer' | 'ux_researcher' | 'developer' | 'product_manager' | 'stakeholder';
}

const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  currentRequest: '',
  agentResponses: [],
  importedDocs: [],
  agentConversations: {},
  prdDocument: null,
  designDocument: null,
  showInsights: true,
  showReferences: true,
  showConfidence: true,
  showQuestions: true,
  synthesisView: false,
  activeTab: 'all'
};

const STORAGE_KEY = 'aiPrototyper_workspaceState';

// Custom serializer for dates and other complex objects
const serializeState = (state: WorkspaceState): string => {
  return JSON.stringify(state, (_key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
};

// Custom deserializer for dates and other complex objects
const deserializeState = (serializedState: string): WorkspaceState => {
  return JSON.parse(serializedState, (_key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  });
};

export const useWorkspacePersistence = () => {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(DEFAULT_WORKSPACE_STATE);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = deserializeState(savedState);
        setWorkspaceState(parsed);
      }
    } catch (error) {
      console.error('Failed to load workspace state:', error);
      // If loading fails, use default state
      setWorkspaceState(DEFAULT_WORKSPACE_STATE);
    }
  }, []);

  // Save state to localStorage whenever it changes
  const saveState = useCallback((newState: Partial<WorkspaceState>) => {
    const updatedState = { ...workspaceState, ...newState };
    setWorkspaceState(updatedState);
    
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(updatedState));
    } catch (error) {
      console.error('Failed to save workspace state:', error);
    }
  }, [workspaceState]);

  // Clear workspace data
  const clearWorkspace = useCallback(() => {
    setWorkspaceState(DEFAULT_WORKSPACE_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear workspace state:', error);
    }
  }, []);

  // Export workspace data
  const exportWorkspace = useCallback(() => {
    return serializeState(workspaceState);
  }, [workspaceState]);

  // Import workspace data
  const importWorkspace = useCallback((serializedData: string) => {
    try {
      const parsed = deserializeState(serializedData);
      setWorkspaceState(parsed);
      localStorage.setItem(STORAGE_KEY, serializedData);
      return true;
    } catch (error) {
      console.error('Failed to import workspace state:', error);
      return false;
    }
  }, []);

  return {
    workspaceState,
    saveState,
    clearWorkspace,
    exportWorkspace,
    importWorkspace
  };
};