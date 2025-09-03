/**
 * @file The main modal for displaying detailed health status.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { HealthData, HealthError } from '../../types/health';
import { formatTimestamp } from '../../utilities/formatters/time';
import { HealthSummaryCards } from './HealthSummaryCards';
import { ComponentStatusList } from './ComponentStatusList';
import { IssueLog } from './IssueLog';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  healthData: HealthData | null;
  errors: HealthError[];
  warnings: HealthError[];
}

export const HealthModal: React.FC<HealthModalProps> = ({ isOpen, onClose, onRefresh, healthData, errors, warnings }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20">
      <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
              🏥 NEURAL SYSTEM HEALTH
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">×</button>
          </div>
        </div>

        <div className="px-6 pb-6 flex-grow overflow-y-auto">
          {healthData ? (
            <div className="space-y-6">
              <HealthSummaryCards summary={healthData.summary} />
              <ComponentStatusList components={healthData.components} />
              <IssueLog errors={errors} warnings={warnings} />
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10">Loading health data...</div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-900 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-colors"
            >
              🔄 Refresh Health Check
            </button>
            {healthData && (
              <span className="text-sm text-gray-400">
                Last check: {formatTimestamp(healthData.summary.last_full_check)}
              </span>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 rounded-lg font-semibold text-white transition-all duration-300"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
