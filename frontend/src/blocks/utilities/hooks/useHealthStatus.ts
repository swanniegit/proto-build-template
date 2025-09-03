/**
 * @file Controller hook for managing all health status logic.
 * @coder Gemini
 * @category Controller/Utility Block
 */
import { useState, useEffect, useCallback } from 'react';
import { HealthData, HealthError } from '../../types/health';
import { healthApi } from '../../bridges/healthApi';

export const useHealthStatus = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [quickStatus, setQuickStatus] = useState<HealthData['status'] | null>('healthy');
  const [errors, setErrors] = useState<HealthError[]>([]);
  const [warnings, setWarnings] = useState<HealthError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchQuick = useCallback(async () => {
    try {
      // Don't set loading for quick background checks
      const data = await healthApi.fetchQuickStatus();
      setQuickStatus(data.status);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Quick health check failed:', error);
      setQuickStatus('error');
    }
  }, []);

  const fetchFull = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await healthApi.fetchFullStatus();
      setHealthData(data);
      setQuickStatus(data.status);
      setLastCheck(new Date());

      if (data.summary.error_components > 0 || data.summary.warning_components > 0) {
        const logData = await healthApi.fetchErrorLog();
        setErrors(logData.errors || []);
        setWarnings(logData.warnings || []);
      } else {
        setErrors([]);
        setWarnings([]);
      }
    } catch (error) {
      console.error('Full health check failed:', error);
      setQuickStatus('error');
      setHealthData(null); // Clear data on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial quick check
    fetchQuick();
    // Regular checks
    const interval = setInterval(fetchQuick, 30000);
    return () => clearInterval(interval);
  }, [fetchQuick]);

  return {
    healthData,
    quickStatus,
    errors,
    warnings,
    isLoading,
    lastCheck,
    refreshFullHealth: fetchFull,
  };
};
