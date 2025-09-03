/**
 * @file Hook to manage login form state and submission.
 * @coder Gemini
 * @category Utility/Controller Hook
 */
import { useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { LoginRequest } from '../../types/auth';

interface UseLoginFormProps {
  onSuccess: () => void;
}

export const useLoginForm = ({ onSuccess }: UseLoginFormProps) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return { formData, error, isLoading, handleChange, handleSubmit };
};