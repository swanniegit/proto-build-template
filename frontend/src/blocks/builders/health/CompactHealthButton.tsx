/**
 * @file Renders the compact health status button.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { HealthData } from '../../types/health';
import { HealthStatusIcon } from '../../utilities/ui/HealthStatusIcon';
import { formatTime } from '../../utilities/formatters/time';

interface CompactHealthButtonProps {
  status: HealthData['status'] | null;
  isLoading: boolean;
  lastCheck: Date | null;
  onClick: () => void;
}

const getStatusColor = (status: HealthData['status'] | null) => {
  switch (status) {
    case 'error': return 'text-red-400';
    case 'warning': return 'text-yellow-400';
    default: return 'text-green-400';
  }
};

const getStatusBg = (status: HealthData['status'] | null) => {
  switch (status) {
    case 'error': return 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
    case 'warning': return 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20';
    default: return 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20';
  }
};

export const CompactHealthButton: React.FC<CompactHealthButtonProps> = ({ status, isLoading, lastCheck, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-300 hover:scale-105 ${getStatusBg(status)}`}
    title="Click for detailed health status"
  >
    <HealthStatusIcon status={status} isLoading={isLoading} />
    <span className={`text-sm font-semibold ${getStatusColor(status)}`}>
      SYSTEM
    </span>
    {lastCheck && (
      <span className="text-xs text-gray-400">
        {formatTime(lastCheck)}
      </span>
    )}
  </button>
);
