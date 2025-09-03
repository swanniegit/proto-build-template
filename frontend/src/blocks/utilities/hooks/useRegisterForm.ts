/**
 * @file Hook to manage register form state, validation, and submission.
 * @coder Gemini
 * @category Utility/Controller Hook
 */
import { useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { RegisterRequest } from '../../types/auth';

interface UseRegisterFormProps {
  onSuccess: () => void;
}

export const useRegisterForm = ({ onSuccess }: UseRegisterFormProps) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '', full_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const { confirmPassword, ...registerData } = formData;
    try {
      await register(registerData);
      onSuccess();
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return { formData, errors, isLoading, handleChange, handleSubmit };
};