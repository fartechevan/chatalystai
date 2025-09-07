import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { sendTextServiceServerSide } from '@/integrations/evolution-api/services/sendTextServiceServerSide';
import { sendMediaService, SendMediaParams } from '@/integrations/evolution-api/services/sendMediaService';
import { sendButtonService } from '@/integrations/evolution-api/services/sendButtonService';
import { checkCustomersAgainstBlacklist, checkPhoneNumbersAgainstBlacklist } from './blacklistService';

interface CustomerInfo {
  id: string;
  phone_number: string;
}

interface RecipientInfo extends CustomerInfo {
  recipient_id: string; // ID from broadcast_recipients table
}

export interface SendBroadcastServerSideParams {
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

export interface SendBroadcastServerSideResult {
  broadcastId: string;
  successfulSends: number;
  failedSends: number;
  totalAttempted: number;
}

/**
 * Server-side version of sendBroadcastService that uses service role authentication
 * to bypass RLS policies and session requirements.
 */
export const sendBroadcastServiceServerSide = async (params: SendBroadcastServerSideParams): Promise<SendBroadcastServerSideResult> => {
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

  // Create Supabase client with service role key for server-side operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for server-side operation');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  if (targetMode === 'customers' && (!customerIds || customerIds.length === 0)) {
    throw new Error("customerIds must be provided for 'customers' target mode.");
  }
  if (targetMode === 'segment' && !segmentId) {
    throw new Error("segmentId must be provided for 'segment' target mode.");
  }
  if (targetMode === 'csv' && (!phoneNumbers || phoneNumbers.length === 0)) {
    throw new Error("phoneNumbers must be provided for 'csv' target mode.");
  }

  // Calculate total recipient count
  let recipientCount = 0;
  
  // For segments, we need to fetch the contacts first to get the count
  if (targetMode === 'segment' && segmentId) {
    try {
      const { data: segmentContactsData, error: segmentContactsError } = await supabase
        .from('segment_contacts')
        .select('contact_id')
        .eq('segment_id', segmentId);
      
      if (segmentContactsError) throw segmentContactsError;
      recipientCount = (segmentContactsData || []).length;
      
      if (recipientCount === 0) {
        throw new Error("No contacts found in the selected segment");
      }
    } catch (error) {
      console.error("Error fetching segment contacts count:", error);
      throw new Error(`Failed to get contacts from segment: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (targetMode === 'customers' && customerIds) {
    recipientCount = customerIds.length;
  } else if (targetMode === 'csv' && phoneNumbers) {
    recipientCount = phoneNumbers.length;
  }

  let broadcastId: string;
  let validRecipients: RecipientInfo[] = [];

  try {
    // Create the broadcast record
    const insertPayload: { 
      message_text: string;
      integration_config_id: string;
      instance_id: string;
      segment_id?: string;
    } = {
      message_text: messageText,
      integration_config_id: integrationConfigId,
      instance_id: instanceId,
    };

    if (targetMode === 'segment' && segmentId) {
      insertPayload.segment_id = segmentId;
    }

    const { data: broadcastData, error: broadcastInsertError } = await supabase
      .from('broadcasts')
      .insert(insertPayload)
      .select('id')
      .single();
    
    if (broadcastInsertError) {
      console.error("Error inserting into broadcasts table:", broadcastInsertError);
      throw broadcastInsertError;
    }
    broadcastId = broadcastData.id;

    let validCustomers: CustomerInfo[] = [];

    if (targetMode === 'segment' && segmentId) {
      const { data: segmentContactsData, error: segmentContactsError } = await supabase
        .from('segment_contacts')
        .select(`customers ( id, phone_number )`)
        .eq('segment_id', segmentId);
      
      if (segmentContactsError) throw segmentContactsError;
      validCustomers = (segmentContactsData || [])
        .map(sc => sc.customers)
        .filter((c): c is CustomerInfo => c !== null && typeof c.phone_number === 'string' && c.phone_number.trim() !== '');
      
    } else if (targetMode === 'customers' && customerIds && customerIds.length > 0) {
      const { data: customersData, error: customerError } = await supabase
        .from("customers")
        .select("id, phone_number")
        .in("id", customerIds);
      
      if (customerError) throw customerError;
      validCustomers = (customersData || []).filter(
        (c): c is CustomerInfo => typeof c.phone_number === 'string' && c.phone_number.trim() !== ''
      );
    }

    if (targetMode === 'customers' || targetMode === 'segment') {
      if (validCustomers.length === 0) {
        console.warn("sendBroadcastServiceServerSide: No valid recipients found for the broadcast target.");
        return { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 };
      }

      // Check customers against blacklist
      const blacklistResult = await checkCustomersAgainstBlacklist(validCustomers);
      const nonBlacklistedCustomers = blacklistResult.validCustomers;
      
      // Log blacklisted customers that will be skipped
      if (blacklistResult.blacklistedCustomers.length > 0) {
        console.log(`sendBroadcastServiceServerSide: Skipping ${blacklistResult.blacklistedCustomers.length} blacklisted customers`);
        blacklistResult.blacklistedCustomers.forEach(customer => {
          console.log(`Blacklisted customer skipped: ${customer.phone_number}`);
        });
      }

      if (nonBlacklistedCustomers.length === 0) {
        console.warn("sendBroadcastServiceServerSide: All customers are blacklisted, no recipients to send to.");
        return { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 };
      }

      const recipientRecords = nonBlacklistedCustomers.map(c => ({
        broadcast_id: broadcastId,
        customer_id: c.id,
        phone_number: c.phone_number,
        status: 'pending',
      }));
      
      const { data: insertedRecipients, error: recipientInsertError } = await supabase
        .from('broadcast_recipients')
        .insert(recipientRecords)
        .select('id, phone_number, customer_id');
      
      if (recipientInsertError) throw recipientInsertError;
      validRecipients = (insertedRecipients || []).map(r => ({
        id: r.customer_id,
        phone_number: r.phone_number,
        recipient_id: r.id
      }));
    }
  } catch (error) {
    console.error("sendBroadcastServiceServerSide: Error setting up broadcast tracking:", error);
    throw new Error(`Failed to setup broadcast tracking: ${error instanceof Error ? error.message : String(error)}`);
  }

  let successfulSends = 0;
  let failedSends = 0;
  let totalAttempted = 0;

  let numbersToSend: string[] = [];
  
  if (targetMode === 'csv' && phoneNumbers) {
    // Check phone numbers against blacklist for CSV mode
    const blacklistResult = await checkPhoneNumbersAgainstBlacklist(phoneNumbers);
    numbersToSend = blacklistResult.validPhoneNumbers;
    
    // Log blacklisted phone numbers that will be skipped
    if (blacklistResult.blacklistedPhoneNumbers.length > 0) {
      console.log(`sendBroadcastServiceServerSide: Skipping ${blacklistResult.blacklistedPhoneNumbers.length} blacklisted phone numbers`);
      blacklistResult.blacklistedPhoneNumbers.forEach(phone => {
        console.log(`Blacklisted phone number skipped: ${phone}`);
      });
    }

    if (numbersToSend.length === 0) {
      console.warn("sendBroadcastServiceServerSide: All phone numbers are blacklisted, no recipients to send to.");
      return { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 };
    }
  } else {
    numbersToSend = validRecipients.map(r => r.phone_number);
  }
  
  totalAttempted = numbersToSend.length;

  const recipientRecordMap = new Map(validRecipients.map(r => [r.phone_number, r.recipient_id]));

  for (const number of numbersToSend) {
    const recipientRecordId = recipientRecordMap.get(number);
    let updatePayload: { status: string; error_message?: string | null; sent_at?: string | null } = { status: 'failed', error_message: null, sent_at: null };

    try {
      if (includeOptOutButton && !media) {
        // Send button message with opt-out button for text messages only when includeOptOutButton is true
        await sendButtonService({
          instance: instanceId,
          integrationId: integrationConfigId,
          number: number,
          title: "📢 Broadcast Message",
          description: messageText,
          footer: "Reply STOP to opt out",
          buttons: [
            {
              title: "Opt out",
              displayText: "Opt out",
              id: "1"
            }
          ]
        });
      } else if (media && mimetype && fileName) {
        // For media messages, send media without button (Evolution API doesn't support buttons with media)
        await sendMediaService({
          instance: instanceId,
          integrationId: integrationConfigId,
          number: number,
          media: media,
          mimetype: mimetype,
          fileName: fileName,
          caption: messageText, // Use messageText as caption
        });
      } else {
        // Send regular text message without button
        await sendTextServiceServerSide({
          integrationId: integrationConfigId,
          instance: instanceId,
          number: number,
          text: messageText,
          authUserId: userId,
        });
      }
      successfulSends++;
      updatePayload = { status: 'sent', sent_at: new Date().toISOString(), error_message: null };
    } catch (error: unknown) {
      failedSends++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      updatePayload = { status: 'failed', error_message: errorMessage, sent_at: null };
      console.error(`sendBroadcastServiceServerSide: Failed to send to ${number}:`, errorMessage);
    }

    if (recipientRecordId) {
      try {
        const { error: updateError } = await supabase
          .from('broadcast_recipients')
          .update(updatePayload)
          .eq('id', recipientRecordId);
        if (updateError) {
          console.error(`sendBroadcastServiceServerSide: Failed to update status for recipient ${recipientRecordId} (${number}): ${updateError.message}`);
        }
      } catch (dbUpdateError) {
        console.error(`sendBroadcastServiceServerSide: Database error updating status for recipient ${recipientRecordId}:`, dbUpdateError);
      }
    }
  }

  // Determine overall broadcast status
  let overallBroadcastStatus = 'pending';
  if (totalAttempted === 0) {
    overallBroadcastStatus = 'completed';
  } else if (successfulSends === totalAttempted) {
    overallBroadcastStatus = 'completed';
  } else if (failedSends === totalAttempted) {
    overallBroadcastStatus = 'failed';
  } else if (successfulSends > 0 && successfulSends < totalAttempted) {
    overallBroadcastStatus = 'partial_completion';
  }

  if (broadcastId) {
    try {
      const updatePayload = { 
        status: overallBroadcastStatus, 
        updated_at: new Date().toISOString() 
      };
      const { error: updateBroadcastError } = await supabase
        .from('broadcasts')
        .update(updatePayload as any)
        .eq('id', broadcastId);

      if (updateBroadcastError) {
        console.error(`sendBroadcastServiceServerSide: Failed to update overall status for broadcast ${broadcastId}: ${updateBroadcastError.message}`);
      }
    } catch (dbUpdateError) {
      console.error(`sendBroadcastServiceServerSide: Database error updating overall status for broadcast ${broadcastId}:`, dbUpdateError);
    }
  }

  return {
    broadcastId,
    successfulSends,
    failedSends,
    totalAttempted,
  };
};