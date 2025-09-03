/**
 * @file Animated background for the Settings page.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

export const SettingsBackground: React.FC = () => (
  <div className="fixed inset-0 z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-cyan-900/10"></div>
    <div className="absolute top-32 right-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute bottom-32 left-32 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
    <div className="neural-grid absolute inset-0"></div>
  </div>
);
