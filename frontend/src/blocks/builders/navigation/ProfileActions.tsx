/**
 * @file Actions section of the navbar (Health, Auth).
 * @coder Claude
 * @category Builder Block
 */
import React from 'react';
import HealthStatus from '../../../components/HealthStatus';
import { useAuth } from '../../providers/AuthProvider';
import { UserButton } from './UserButton';
import { LoginButton } from './LoginButton';

interface ProfileActionsProps {
  onLoginClick: () => void;
  onProfileClick: () => void;
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({ onLoginClick, onProfileClick }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div className="hidden md:flex items-center space-x-3">
      <HealthStatus compact={true} />
      
      {isAuthenticated ? (
        <UserButton user={user} onClick={onProfileClick} />
      ) : (
        <>{!isLoading && <LoginButton onClick={onLoginClick} />}</>
      )}
    </div>
  );
};