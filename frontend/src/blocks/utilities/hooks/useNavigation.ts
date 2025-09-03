/**
 * @file Hook to manage navigation state and logic.
 * @coder Gemini
 * @category Utility Block
 */
import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  }, [navigate]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const isActive = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  return {
    activePath: location.pathname,
    isMobileMenuOpen,
    handleNavigate,
    toggleMobileMenu,
    isActive,
  };
};
