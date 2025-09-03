/**
 * @file Renders the summary cards for the health status modal.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { HealthData } from '../../types/health';
import { formatUptime } from '../../utilities/formatters/time';

interface HealthSummaryCardsProps {
  summary: HealthData['summary'];
}

export const HealthSummaryCards: React.FC<HealthSummaryCardsProps> = ({ summary }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
      <div className="text-green-400 text-2xl font-bold">{summary.healthy_components}</div>
      <div className="text-green-300 text-sm">Healthy</div>
    </div>
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
      <div className="text-yellow-400 text-2xl font-bold">{summary.warning_components}</div>
      <div className="text-yellow-300 text-sm">Warnings</div>
    </div>
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
      <div className="text-red-400 text-2xl font-bold">{summary.error_components}</div>
      <div className="text-red-300 text-sm">Errors</div>
    </div>
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
      <div className="text-blue-400 text-2xl font-bold">{formatUptime(summary.uptime)}</div>
      <div className="text-blue-300 text-sm">Uptime</div>
    </div>
  </div>
);
