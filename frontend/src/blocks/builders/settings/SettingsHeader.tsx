/**
 * @file Header for the Settings page.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

export const SettingsHeader: React.FC = () => (
  <div className="mb-16">
    <h1 className="text-6xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 bg-clip-text tracking-wider mb-4">
      NEURAL CONFIG
    </h1>
    <p className="text-gray-400 text-xl font-light tracking-wide">Configure your AI neural network parameters and behavioral matrices</p>
  </div>
);
