/**
 * Authentication types for the Neural AI System
 */

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'premium' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  preferences: UserPreferences;
  stats: UserStats;
  created_at: string;
  last_login_at?: string;
}

import { UserPreferences } from './settings';

export interface UserStats {
  total_sessions: number;
  total_agents_used: number;
  total_custom_agents: number;
  favorite_agent_types: Record<string, number>;
  last_login?: string;
  account_created: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface CustomAgent {
  id: string;
  user_id: string;
  name: string;
  description: string;
  prompt: string;
  color: string;
  icon: string;
  is_public: boolean;
  is_active: boolean;
  usage_count: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_input: string;
  selected_agents: string[];
  llm_settings: Record<string, any>;
  agent_results: any[];
  synthesis_results: any[];
  total_execution_time: number;
  status: string;
}