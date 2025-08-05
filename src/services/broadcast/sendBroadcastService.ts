import { supabase } from '@/integrations/supabase/client';
import { sendTextService } from '@/integrations/evolution-api/services/sendTextService';
import { sendMediaService, SendMediaParams } from '@/integrations/evolution-api/services/sendMediaService';
import { sendButtonService } from '@/integrations/evolution-api/services/sendButtonService';
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
    includeOptOutButton = false // Default to false to maintain existing behavior
  } = params;

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

  // Check WhatsApp blast limit before proceeding
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session?.data?.session?.access_token;

    if (!accessToken) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    const { data: blastLimitCheck, error: blastLimitError } = await supabase.functions.invoke(
      'check-whatsapp-blast-limit',
      {
        body: { recipient_count: recipientCount, check_only: false },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (blastLimitError) {
      throw new Error(`Failed to check blast limit: ${blastLimitError.message}`);
    }

    if (blastLimitCheck && !blastLimitCheck.allowed) {
      throw new Error(blastLimitCheck.error_message || 'Daily WhatsApp blast limit exceeded');
    }
  } catch (error) {
    console.error("Error checking WhatsApp blast limit:", error);
    throw new Error(`WhatsApp blast limit check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  let broadcastId: string;
  let validRecipients: RecipientInfo[] = [];

  try {
    // The 'integrationConfigId' received in params is the PK of 'integrations_config' table.
    // This will be inserted into the new 'integration_config_id' column in the 'broadcasts' table.
    const insertPayload: { 
      message_text: string;
      integration_config_id: string; // Column in 'broadcasts' table
      instance_id: string;
      segment_id?: string;
    } = {
      message_text: messageText,
      integration_config_id: integrationConfigId, // Use the received PK of integrations_config
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
      
      // We've already checked the blast limit with the actual count before fetching the contacts
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
          console.warn("sendBroadcastService: No valid recipients found for the broadcast target.");
          return { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 };
        }
        const recipientRecords = validCustomers.map(c => ({
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
    console.error("sendBroadcastService: Error setting up broadcast tracking:", error);
    throw new Error(`Failed to setup broadcast tracking: ${error instanceof Error ? error.message : String(error)}`);
  }

  let successfulSends = 0;
  let failedSends = 0;
  let totalAttempted = 0;

  const numbersToSend = targetMode === 'csv' ? (phoneNumbers || []) : validRecipients.map(r => r.phone_number);
  totalAttempted = numbersToSend.length;

  const recipientRecordMap = new Map(validRecipients.map(r => [r.phone_number, r.recipient_id]));

  for (const number of numbersToSend) {
    const recipientRecordId = recipientRecordMap.get(number);
    let updatePayload: { status: string; error_message?: string | null; sent_at?: string | null } = { status: 'failed', error_message: null, sent_at: null };

    try {
      if (includeOptOutButton && !media) {
        // Send button message with opt-out button for text messages
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
        await sendTextService({
            integrationId: integrationConfigId,
            instance: instanceId,
            number: number,
            text: messageText,
        });
      }
      successfulSends++;
      updatePayload = { status: 'sent', sent_at: new Date().toISOString(), error_message: null };
    } catch (error: unknown) {
      failedSends++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      updatePayload = { status: 'failed', error_message: errorMessage, sent_at: null };
      console.error(`sendBroadcastService: Failed to send to ${number}:`, errorMessage);
    }

    if (recipientRecordId) {
        try {
          const { error: updateError } = await supabase
            .from('broadcast_recipients')
            .update(updatePayload)
            .eq('id', recipientRecordId);
          if (updateError) {
            console.error(`sendBroadcastService: Failed to update status for recipient ${recipientRecordId} (${number}): ${updateError.message}`);
          }
        } catch (dbUpdateError) {
           console.error(`sendBroadcastService: Database error updating status for recipient ${recipientRecordId}:`, dbUpdateError);
        }
    }
  }

  // Determine overall broadcast status
  let overallBroadcastStatus = 'pending'; // Default, should be overwritten
  if (totalAttempted === 0) {
    overallBroadcastStatus = 'completed'; // No recipients, so considered completed.
  } else if (successfulSends === totalAttempted) {
    overallBroadcastStatus = 'completed';
  } else if (failedSends === totalAttempted) {
    overallBroadcastStatus = 'failed';
  } else if (successfulSends > 0 && successfulSends < totalAttempted) {
    overallBroadcastStatus = 'partial_completion';
  } else if (successfulSends === 0 && failedSends > 0 && failedSends < totalAttempted) {
    // This case implies some recipients were neither successful nor failed, which shouldn't happen with current logic
    // but if it did, 'partial_completion' or 'failed' might be appropriate.
    // For now, this will fall into 'failed' if successfulSends is 0 and totalAttempted > 0.
    // If successfulSends is 0 and failedSends is 0 but totalAttempted > 0, it means something went wrong before sending.
    // The existing logic should cover most cases for 'failed' or 'partial_completion'.
    // If successfulSends = 0 and failedSends = 0 and totalAttempted > 0, it implies an issue before the loop,
    // or all recipients were skipped. The initial 'pending' might persist or be updated to 'failed'.
    // Let's ensure a clear path: if not all successful and not all failed, and some attempts were made, it's partial.
    // If all attempts failed, it's 'failed'.
    // If all attempts succeeded, it's 'completed'.
    // If no attempts (totalAttempted = 0), it's 'completed'.
    // The above conditions should cover these.
  }


  if (broadcastId) {
    try {
      // Reverting to 'as any' due to persistent type mismatch for the update operation.
      // We've verified the 'status' column exists and is updatable in the 'broadcasts' table.
      const updatePayload = { 
        status: overallBroadcastStatus, 
        updated_at: new Date().toISOString() 
      };
      const { error: updateBroadcastError } = await supabase
        .from('broadcasts')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updatePayload as any) 
        .eq('id', broadcastId);

      if (updateBroadcastError) {
        console.error(`sendBroadcastService: Failed to update overall status for broadcast ${broadcastId}: ${updateBroadcastError.message}`);
      }
    } catch (dbUpdateError) {
      console.error(`sendBroadcastService: Database error updating overall status for broadcast ${broadcastId}:`, dbUpdateError);
    }
  }

  return {
    broadcastId,
    successfulSends,
    failedSends,
    totalAttempted,
  };
};
