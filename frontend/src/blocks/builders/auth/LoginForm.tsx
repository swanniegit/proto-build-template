/**
 * @file Dumb UI component for the login form.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { useLoginForm } from '../../utilities/hooks/useLoginForm';
import { FormField } from './FormField';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const { formData, error, isLoading, handleChange, handleSubmit } = useLoginForm({ onSuccess });

  return (
    <div className="bg-black/80 border border-cyan-400/30 rounded-lg p-8 backdrop-blur-sm">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">Neural Login</h2>
        <p className="text-cyan-200/70">Access your AI workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Email"
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
        />
        <FormField
          label="Password"
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
        />

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-md p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-md transition-all duration-200 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-cyan-200/70">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};
