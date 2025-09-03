/**
 * @file Buttons for resetting and purging data.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface DataManagementActionsProps {
  onReset: () => void;
  onPurge: () => void;
}

export const DataManagementActions: React.FC<DataManagementActionsProps> = ({ onReset, onPurge }) => (
  <div className="glass-dark rounded-2xl border border-red-500/20 p-8 hover:border-red-500/40 transition-all duration-500">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-red-400 mb-2 tracking-wider flex items-center">
          <span className="text-3xl mr-4">⚠️</span>
          DATA MANAGEMENT
        </h2>
        <p className="text-gray-400 text-lg">Manage neural data storage and system reset protocols</p>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={onReset}
          className="px-6 py-3 border border-yellow-500/50 text-yellow-400 rounded-xl hover:bg-yellow-500/10 hover:border-yellow-500 transition-all duration-300 font-bold tracking-wider"
        >
          RESET DEFAULTS
        </button>
        <button
          onClick={onPurge}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-xl hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 font-bold tracking-wider transform hover:scale-105"
        >
          PURGE ALL DATA
        </button>
      </div>
    </div>
  </div>
);
