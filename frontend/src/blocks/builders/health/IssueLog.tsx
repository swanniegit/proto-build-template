/**
 * @file Renders the list of recent issues (errors and warnings).
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { HealthError } from '../../types/health';
import { formatTimestamp } from '../../utilities/formatters/time';

interface IssueLogProps {
  errors: HealthError[];
  warnings: HealthError[];
}

export const IssueLog: React.FC<IssueLogProps> = ({ errors, warnings }) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-white mb-4">Recent Issues</h3>
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div key={`error-${index}`} className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">✗</span>
              <span className="font-semibold text-red-300">{error.component}</span>
              <span className="text-xs text-gray-400">{formatTimestamp(error.timestamp)}</span>
            </div>
            <div className="text-red-200 text-sm mt-1">{error.message}</div>
          </div>
        ))}
        {warnings.map((warning, index) => (
          <div key={`warning-${index}`} className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">⚠</span>
              <span className="font-semibold text-yellow-300">{warning.component}</span>
              <span className="text-xs text-gray-400">{formatTimestamp(warning.timestamp)}</span>
            </div>
            <div className="text-yellow-200 text-sm mt-1">{warning.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
