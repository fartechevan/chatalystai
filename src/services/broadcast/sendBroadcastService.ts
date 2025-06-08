// Removed apiServiceInstance and getEvolutionCredentials imports
import { supabase } from '@/integrations/supabase/client'; // Assuming path
import { sendTextService } from '@/integrations/evolution-api/services/sendTextService'; // Import the service we want to reuse

interface CustomerInfo {
  id: string;
  phone_number: string;
}

interface RecipientInfo extends CustomerInfo {
    recipient_id: string; // ID from broadcast_recipients table
}

// Updated parameters to include target mode and phone numbers for CSV mode
export interface SendBroadcastParams {
  targetMode: 'customers' | 'segment' | 'csv';
  customerIds?: string[];   // Used when targetMode is 'customers'
  segmentId?: string;     // Used when targetMode is 'segment'
  phoneNumbers?: string[];  // Used when targetMode is 'csv'
  messageText: string;
  integrationId: string;
  instanceId: string;
}

export interface SendBroadcastResult {
  broadcastId: string;
  successfulSends: number;
  failedSends: number;
  totalAttempted: number;
}

/**
 * Sends a broadcast message directly via the Evolution API from the client-side.
 * Handles database operations for tracking and makes individual API calls.
 * @param params - The parameters for sending the broadcast message.
 * @returns A promise that resolves with the broadcast summary on success.
 * @throws If any step (db operations, calling sendTextService) fails critically.
 */
export const sendBroadcastService = async (params: SendBroadcastParams): Promise<SendBroadcastResult> => {
  // Destructure params
  const { targetMode, customerIds, segmentId, phoneNumbers, messageText, integrationId, instanceId } = params;

  // Validate required parameters based on mode
  if (targetMode === 'customers' && (!customerIds || customerIds.length === 0)) {
    throw new Error("customerIds must be provided for 'customers' target mode.");
  }
  if (targetMode === 'segment' && !segmentId) {
    throw new Error("segmentId must be provided for 'segment' target mode.");
  }
  if (targetMode === 'csv' && (!phoneNumbers || phoneNumbers.length === 0)) {
    throw new Error("phoneNumbers must be provided for 'csv' target mode.");
  }

  const targetDescription =
    targetMode === 'segment' ? `segment ${segmentId}` :
    targetMode === 'csv' ? `${phoneNumbers?.length || 0} numbers from CSV` :
    `${customerIds?.length || 0} selected customers`;

  // Credentials handled by sendTextService

  // --- 2. Setup Broadcast Tracking in DB ---
  let broadcastId: string;
  let validRecipients: RecipientInfo[] = [];
  try {
    // Create Broadcast Record - Store the actual instanceId (UUID)
    const insertPayload: { 
      message_text: string; 
      integration_id: string; 
      instance_id: string; 
      segment_id?: string; // Make segment_id optional in the payload type
    } = { 
      message_text: messageText, 
      integration_id: integrationId, 
      instance_id: instanceId 
    };

    if (targetMode === 'segment' && segmentId) {
      insertPayload.segment_id = segmentId;
    }

    const { data: broadcastData, error: broadcastInsertError } = await supabase
      .from('broadcasts')
      .insert(insertPayload)
      .select('id')
      .single();
    if (broadcastInsertError) throw broadcastInsertError;
    broadcastId = broadcastData.id;

    // Fetch target customers based on mode
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
    // NOTE: CSV mode handles recipient creation differently below

    // Create recipient records ONLY for 'customers' and 'segment' modes here
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
          .select('id, phone_number, customer_id'); // Select needed info
        if (recipientInsertError) throw recipientInsertError;

        // Map to RecipientInfo structure for status updates later
        validRecipients = (insertedRecipients || []).map(r => ({
            id: r.customer_id, // customer_id
            phone_number: r.phone_number,
            recipient_id: r.id // broadcast_recipients.id
        }));
    }
    // For CSV mode, recipient records are not created upfront as customer_id might be missing

  } catch (error) {
    console.error("sendBroadcastService: Error setting up broadcast tracking:", error);
    throw new Error(`Failed to setup broadcast tracking: ${error instanceof Error ? error.message : String(error)}`);
  }

  // --- 3. Send Messages using sendTextService & Update Status ---
  let successfulSends = 0;
  let failedSends = 0;
  let totalAttempted = 0;

  // Determine the list of phone numbers to iterate over
  const numbersToSend = targetMode === 'csv' ? (phoneNumbers || []) : validRecipients.map(r => r.phone_number);
  totalAttempted = numbersToSend.length;

  // Create a map for quick lookup of recipient record ID by phone number (for customers/segment modes)
  const recipientRecordMap = new Map(validRecipients.map(r => [r.phone_number, r.recipient_id]));

  for (const number of numbersToSend) {
    const recipientRecordId = recipientRecordMap.get(number); // Use const, will be undefined for CSV-only numbers
    let updatePayload: { status: string; error_message?: string | null; sent_at?: string | null } = { status: 'failed', error_message: null, sent_at: null };

    try {
      await sendTextService({
          integrationId: integrationId,
          instance: instanceId,
          number: number, // Send to the raw number
          text: messageText,
      });
      successfulSends++;
      updatePayload = { status: 'sent', sent_at: new Date().toISOString(), error_message: null };
    } catch (error: unknown) {
      failedSends++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      updatePayload = { status: 'failed', error_message: errorMessage, sent_at: null };
      console.error(`sendBroadcastService: Failed to send to ${number}:`, errorMessage);
    }

    // Update recipient status in DB *only if* a record exists (i.e., for customers/segment modes)
    if (recipientRecordId) {
        try {
          const { error: updateError } = await supabase
            .from('broadcast_recipients')
            .update(updatePayload)
            .eq('id', recipientRecordId); // Update by recipient ID
          if (updateError) {
            console.error(`sendBroadcastService: Failed to update status for recipient ${recipientRecordId} (${number}): ${updateError.message}`);
          }
        } catch (dbUpdateError) {
           console.error(`sendBroadcastService: Database error updating status for recipient ${recipientRecordId}:`, dbUpdateError);
        }
    }
     // Optional: Add a small delay between requests if needed
     // await new Promise(resolve => setTimeout(resolve, 200));
  }

  // --- 4. Finalize and Return Summary ---
  // Optionally update the main broadcast record status

  return {
    broadcastId,
    successfulSends,
    failedSends,
    totalAttempted, // Use the count of numbers we attempted to send to
  };
};
