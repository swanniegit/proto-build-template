/**
 * @file Defines the type interfaces for the HealthStatus component blocks.
 * @coder Gemini
 * @rewritetime 1 minute
 */

export interface HealthComponent {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  response_time?: number;
  last_check: string;
  details?: Record<string, any>;
}

export interface HealthData {
  status: 'healthy' | 'warning' | 'error';
  components: HealthComponent[];
  summary: {
    total_checks: number;
    healthy_components: number;
    warning_components: number;
    error_components: number;
    uptime: number;
    last_full_check: string;
  };
}

export interface HealthError {
  component: string;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface HealthStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}
