/**
 * @file Renders the list of health statuses for individual components.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { HealthComponent } from '../../types/health';

interface ComponentStatusListProps {
  components: HealthComponent[];
}

const getStatusClass = (status: HealthComponent['status']) => {
  switch (status) {
    case 'healthy': return 'bg-green-900/10 border-green-500/30';
    case 'warning': return 'bg-yellow-900/10 border-yellow-500/30';
    default: return 'bg-red-900/10 border-red-500/30';
  }
};

const getStatusTextColor = (status: HealthComponent['status']) => {
  switch (status) {
    case 'healthy': return 'text-green-300';
    case 'warning': return 'text-yellow-300';
    default: return 'text-red-300';
  }
};

const getStatusIcon = (status: HealthComponent['status']) => {
  switch (status) {
    case 'healthy': return '✓';
    case 'warning': return '⚠';
    default: return '✗';
  }
};

export const ComponentStatusList: React.FC<ComponentStatusListProps> = ({ components }) => (
  <div>
    <h3 className="text-xl font-bold text-white mb-4">Component Status</h3>
    <div className="space-y-3">
      {components.map((component, index) => (
        <div key={index} className={`p-4 rounded-lg border ${getStatusClass(component.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getStatusIcon(component.status)}</span>
              <div>
                <div className="font-semibold text-white">{component.name}</div>
                <div className={`text-sm ${getStatusTextColor(component.status)}`}>
                  {component.message}
                </div>
              </div>
            </div>
            {component.response_time != null && (
              <div className="text-xs text-gray-400">
                {component.response_time.toFixed(2)}s
              </div>
            )}
          </div>
          {component.details && Object.keys(component.details).length > 0 && (
            <div className="mt-2 text-xs text-gray-400 bg-gray-800/50 rounded p-2">
              {Object.entries(component.details).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
