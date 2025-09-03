/**
 * @file Dumb UI component for the register form.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';
import { useRegisterForm } from '../../utilities/hooks/useRegisterForm';
import { FormField } from './FormField';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { formData, errors, isLoading, handleChange, handleSubmit } = useRegisterForm({ onSuccess });

  return (
    <div className="bg-black/80 border border-cyan-400/30 rounded-lg p-8 backdrop-blur-sm">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">Neural Registration</h2>
        <p className="text-cyan-200/70">Join the AI revolution</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <FormField label="Email *" id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="Enter your email" error={errors.email} />
          <FormField label="Username *" id="username" name="username" type="text" required value={formData.username} onChange={handleChange} placeholder="Choose a username" error={errors.username} />
        </div>
        <FormField label="Full Name" id="full_name" name="full_name" type="text" value={formData.full_name} onChange={handleChange} placeholder="Enter your full name (optional)" />
        <div className="grid md:grid-cols-2 gap-6">
          <FormField label="Password *" id="password" name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Create a password" error={errors.password} />
          <FormField label="Confirm Password *" id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" error={errors.confirmPassword} />
        </div>

        {errors.general && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-md p-3">
            <p className="text-red-400 text-sm">{errors.general}</p>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-md transition-all duration-200 disabled:cursor-not-allowed">
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-cyan-200/70">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};
