/**
 * @file Stateless API bridge for authentication endpoints.
 * @coder Claude
 * @category Bridge Block
 */

import { LoginRequest, LoginResponse, RegisterRequest, User } from '../types/auth';
import { tokenStorage } from './tokenStorage';

const API_BASE_URL = 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = tokenStorage.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An unknown error occurred' }));
    throw new Error(error.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const authApi = {
  register: (userData: RegisterRequest): Promise<LoginResponse> => {
    return fetcher(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
  },

  login: (credentials: LoginRequest): Promise<LoginResponse> => {
    return fetcher(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(credentials),
    });
  },

  getCurrentUser: (): Promise<User> => {
    return fetcher(`${API_BASE_URL}/users/me`, {
      headers: getAuthHeaders(),
    });
  },

  updateProfile: (updates: Partial<User>): Promise<User> => {
    return fetcher(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
  },
  
  // Add other auth-related API calls here as needed
};
