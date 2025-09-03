/**
 * @file Reusable form field component.
 * @coder Cursor AI
 * @category Builder Block
 */
import React from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, id, error, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-cyan-300 text-sm font-medium mb-2">
      {label}
    </label>
    <input
      id={id}
      {...props}
      className={`w-full px-4 py-3 bg-black/50 border rounded-md text-cyan-100 placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 ${
        error ? 'border-red-400/50 focus:border-red-400' : 'border-cyan-400/30 focus:border-cyan-400'
      }`}
    />
    {error && <p className="mt-1 text-red-400 text-sm">{error}</p>}
  </div>
);
