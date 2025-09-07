import { supabase } from '@/integrations/supabase/client';
import { sendTextServiceServerSide } from '@/integrations/evolution-api/services/sendTextServiceServerSide';
import { sendMediaService, SendMediaParams } from '@/integrations/evolution-api/services/sendMediaService';
import { sendButtonService } from '@/integrations/evolution-api/services/sendButtonService';
import { checkCustomersAgainstBlacklist, checkPhoneNumbersAgainstBlacklist } from './blacklistService';
// Removed TablesUpdate import as it's not resolving the type issue for the update call as expected.

interface CustomerInfo {
  id: string;
  phone_number: string;
}

interface RecipientInfo extends CustomerInfo {
  recipient_id: string; // ID from broadcast_recipients table
}

export interface SendBroadcastParams {
  targetMode: 'customers' | 'segment' | 'csv';
  customerIds?: string[];
  segmentId?: string;
  phoneNumbers?: string[];
  messageText: string; // Will be caption if media is present
  integrationConfigId: string; // This is integrations_config.id
  instanceId: string;
  media?: string; // Base64 encoded media
  mimetype?: string; // e.g., image/jpeg
  fileName?: string; // e.g., image.jpg
  imageUrl?: string; // Optional image URL (for DB record / UI display)
  includeOptOutButton?: boolean; // Whether to include the opt-out button
  userId: string; // User ID for authentication
}

export interface SendBroadcastResult {
  broadcastId: string;
  successfulSends: number;
  failedSends: number;
  totalAttempted: number;
}

export const sendBroadcastService = async (params: SendBroadcastParams): Promise<SendBroadcastResult> => {
  const { 
    targetMode, 
    customerIds, 
    segmentId, 
    phoneNumbers, 
    messageText, 
    integrationConfigId, 
    instanceId, 
    media,
    mimetype,
    fileName,
    imageUrl,
    includeOptOutButton = false,
    userId
  } = params;

  console.log('sendBroadcastService called with params:', {
    targetMode,
    customerIds: customerIds?.length,
    segmentId,
    phoneNumbers: phoneNumbers?.length,
    messageText: messageText?.substring(0, 50) + '...',
    integrationConfigId,
    instanceId,
    includeOptOutButton,
    userId
  });

  // Validate required fields
  if (!targetMode || !messageText || !integrationConfigId || !instanceId || !userId) {
    throw new Error('Missing required fields: targetMode, messageText, integrationConfigId, instanceId, userId');
  }

  // Validate target mode specific requirements
  if (targetMode === 'customers' && (!customerIds || customerIds.length === 0)) {
    throw new Error("customerIds must be provided for 'customers' target mode.");
  }
  if (targetMode === 'segment' && !segmentId) {
    throw new Error("segmentId must be provided for 'segment' target mode.");
  }
  if (targetMode === 'csv' && (!phoneNumbers || phoneNumbers.length === 0)) {
    throw new Error("phoneNumbers must be provided for 'csv' target mode.");
  }

  try {
    console.log('Calling server-side broadcast service...');
    
    // Call the server-side broadcast edge function
    const { data: result, error } = await supabase.functions.invoke(
      'broadcast-server-side',
      {
        body: {
          targetMode,
          customerIds,
          segmentId,
          phoneNumbers,
          messageText,
          integrationConfigId,
          instanceId,
          media,
          mimetype,
          fileName,
          imageUrl,
          includeOptOutButton,
          userId
        }
      }
    );

    if (error) {
      console.error('Error calling server-side broadcast service:', error);
      throw new Error(`Server-side broadcast failed: ${error.message}`);
    }

    if (!result || !result.success) {
      console.error('Server-side broadcast service returned error:', result);
      throw new Error(result?.error || 'Server-side broadcast service failed');
    }

    console.log('Server-side broadcast completed successfully:', result.data);
    
    return {
      broadcastId: result.data.broadcastId,
      successfulSends: result.data.successfulSends,
      failedSends: result.data.failedSends,
      totalAttempted: result.data.totalAttempted
    };
  } catch (error) {
    console.error('sendBroadcastService error:', error);
    throw error;
  }
};
