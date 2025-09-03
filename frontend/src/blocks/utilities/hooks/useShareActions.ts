/**
 * @file Hook to manage sharing actions for results.
 * @coder Gemini
 * @category Utility/Controller Hook
 */
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../providers/AuthProvider';
import { notificationsApi } from '../../bridges/notificationsApi';

// Assuming AgentResult is a shared type
interface AgentResult { content: any; /* other fields */ }

export const useShareActions = () => {
  const { user } = useAuth();

  const handleShareByEmail = useCallback(async (result: AgentResult) => {
    const recipient = user?.preferences?.notificationEmail;
    if (!recipient) {
      toast.error('No notification email configured in settings.');
      return;
    }

    try {
      toast.loading('Sending to email...');
      await notificationsApi.sendEmail({ content: result.content, recipient });
      toast.dismiss();
      toast.success('Result sent to email!');
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Failed to send email.');
    }
  }, [user]);

  const handleShareToTeams = useCallback(async (result: AgentResult) => {
    const webhookUrl = user?.preferences?.teamsWebhookUrl;
    if (!webhookUrl) {
      toast.error('No Teams webhook URL configured in settings.');
      return;
    }

    try {
      toast.loading('Sending to Teams...');
      await notificationsApi.sendToTeams({ content: result.content, webhookUrl });
      toast.dismiss();
      toast.success('Result sent to Teams!');
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Failed to send to Teams.');
    }
  }, [user]);

  return {
    canShare: !!user?.preferences?.notificationEmail || !!user?.preferences?.teamsWebhookUrl,
    handleShareByEmail,
    handleShareToTeams,
  };
};
