/**
 * @file Abstraction layer for the health check API endpoints.
 * @coder Claude
 * @category Bridge Block
 */
import { HealthData, HealthError } from '../types/health';

const API_BASE_URL = 'http://localhost:8000';

async function fetcher<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const healthApi = {
  fetchQuickStatus: async (): Promise<{ status: 'healthy' | 'warning' | 'error' }> => {
    // This is a simplified assumption. The actual quick endpoint might return a different structure.
    const data = await fetcher<HealthData>('/api/health/quick');
    return { status: data.status };
  },
  fetchFullStatus: async (): Promise<HealthData> => {
    return fetcher<HealthData>('/api/health/');
  },
  fetchErrorLog: async (): Promise<{ errors: HealthError[], warnings: HealthError[] }> => {
    return fetcher<{ errors: HealthError[], warnings: HealthError[] }>('/api/health/errors');
  },
};
