/**
 * @file Composition root for the Navigation component.
 * @coder Cursor AI
 * @category Composition Root
 */
import React from 'react';
import { useAuth } from '../providers/AuthProvider';
import { AuthModal } from '../builders/auth/AuthModal';
import { UserProfile } from '../builders/auth/UserProfile';
import { NAV_ITEMS } from '../constants/navigation';
import { useNavigation } from '../utilities/hooks/useNavigation';
import { useAuthModals } from '../utilities/hooks/useAuthModals';
import { Logo } from '../builders/navigation/Logo';
import { DesktopNav } from '../builders/navigation/DesktopNav';
import { ProfileActions } from '../builders/navigation/ProfileActions';
import { MobileMenuButton } from '../builders/navigation/MobileMenuButton';
import { MobileNav } from '../builders/navigation/MobileNav';

const Navigation: React.FC = () => {
  const {
    activePath,
    isMobileMenuOpen,
    handleNavigate,
    toggleMobileMenu,
    isActive
  } = useNavigation();

  const {
    showAuthModal,
    showUserProfile,
    openModal,
    closeAuthModal,
    closeProfileModal
  } = useAuthModals();

  return (
    <nav className="bg-black/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <Logo onClick={() => handleNavigate('/')} />
          <DesktopNav items={NAV_ITEMS} isActive={isActive} onNavigate={handleNavigate} />
          <ProfileActions 
            onLoginClick={() => openModal('auth')} 
            onProfileClick={() => openModal('profile')} 
          />
          <MobileMenuButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
        </div>

        {isMobileMenuOpen && (
          <MobileNav items={NAV_ITEMS} isActive={isActive} onNavigate={handleNavigate} />
        )}
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        initialMode="login"
      />

      <UserProfile 
        isOpen={showUserProfile}
        onClose={closeProfileModal}
      />
    </nav>
  );
};

export default Navigation;