/**
 * @file Composition root for the HealthStatus component.
 * @coder Gemini
 * @category Composition Root
 */
import React from 'react';
import { HealthStatusProps } from '../blocks/types/health';
import { useHealthStatus } from '../blocks/utilities/hooks/useHealthStatus';
import { useModal } from '../blocks/utilities/hooks/useModal';
import { CompactHealthButton } from '../blocks/builders/health/CompactHealthButton';
import { HealthModal } from '../blocks/builders/health/HealthModal';

const HealthStatus: React.FC<HealthStatusProps> = ({ compact = true }) => {
  const { healthData, quickStatus, errors, warnings, isLoading, lastCheck, refreshFullHealth } = useHealthStatus();
  const { isOpen, openModal, closeModal } = useModal();

  const handleOpenModal = () => {
    refreshFullHealth(); // Fetch full data when opening modal
    openModal();
  };

  if (compact) {
    return (
      <>
        <CompactHealthButton
          status={quickStatus}
          isLoading={isLoading} // Show spinner on button during full refresh
          lastCheck={lastCheck}
          onClick={handleOpenModal}
        />
        <HealthModal
          isOpen={isOpen}
          onClose={closeModal}
          onRefresh={refreshFullHealth}
          healthData={healthData}
          errors={errors}
          warnings={warnings}
        />
      </>
    );
  }

  // Full dashboard view (for dedicated health page)
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text mb-6">
        System Health Dashboard
      </h1>
      {/* Full dashboard content would be composed here using the same blocks */}
      <div>Full-page dashboard view is not yet implemented.</div>
    </div>
  );
};

export default HealthStatus;