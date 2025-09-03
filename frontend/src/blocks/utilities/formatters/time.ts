/**
 * @file Time and date formatting utilities.
 * @coder Gemini
 * @category Utility Block
 */

export const formatUptime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const formatTimestamp = (date: Date | string | null): string => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
};

export const formatTime = (date: Date | string | null): string => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleTimeString();
  } catch (e) {
    return '';
  }
};
