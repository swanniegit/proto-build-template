/**
 * @file Hook to manage authentication-related modal states.
 * @coder Gemini
 * @category Utility Block
 */
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';

type ModalType = 'auth' | 'profile';

export const useAuthModals = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const { isAuthenticated } = useAuth();

  // Debug logging
  console.log('🔍 useAuthModals state:', { isAuthenticated, showAuthModal, showUserProfile });

  // Automatically close auth modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      console.log('🔐 User authenticated, closing auth modal');
      setShowAuthModal(false);
    }
  }, [isAuthenticated, showAuthModal]);

  // Automatically close profile modal when user logs out
  useEffect(() => {
    if (!isAuthenticated && showUserProfile) {
      console.log('🚪 User logged out, closing profile modal');
      setShowUserProfile(false);
    }
  }, [isAuthenticated, showUserProfile]);

  const openModal = useCallback((type: ModalType) => {
    if (type === 'auth') setShowAuthModal(true);
    if (type === 'profile') setShowUserProfile(true);
  }, []);

  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);
  const closeProfileModal = useCallback(() => setShowUserProfile(false), []);

  return {
    showAuthModal,
    showUserProfile,
    openModal,
    closeAuthModal,
    closeProfileModal,
  };
};
