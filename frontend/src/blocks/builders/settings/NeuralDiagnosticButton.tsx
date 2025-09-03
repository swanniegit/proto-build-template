/**
 * @file Button to trigger the neural diagnostic test.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface NeuralDiagnosticButtonProps {
  onClick: () => void;
}

export const NeuralDiagnosticButton: React.FC<NeuralDiagnosticButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 hover:from-cyan-400 hover:via-purple-400 hover:to-blue-400 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/25 transform hover:scale-105 neural-glow tracking-wider"
  >
    🔬 RUN NEURAL DIAGNOSTIC
  </button>
);
