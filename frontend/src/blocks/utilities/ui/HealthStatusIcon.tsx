/**
 * @file Renders the appropriate status icon based on health status.
 * @coder Gemini
 * @category Utility Block (UI)
 */
import React from 'react';
import { HealthData } from '../../types/health';

interface HealthStatusIconProps {
  status: HealthData['status'] | 'unknown' | null;
  isLoading: boolean;
}

export const HealthStatusIcon: React.FC<HealthStatusIconProps> = ({ status, isLoading }) => {
  if (isLoading) {
    return <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-cyan-400 rounded-full"></div>;
  }

  switch (status) {
    case 'healthy':
      return <span className="text-green-400 text-lg">✓</span>;
    case 'warning':
      return <span className="text-yellow-400 text-lg">⚠</span>;
    case 'error':
      return <span className="text-red-400 text-lg">✗</span>;
    default:
      // Return healthy by default before first full load
      return <span className="text-green-400 text-lg">✓</span>;
  }
};
