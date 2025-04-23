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

export interface SendBroadcastParams {
  customerIds: string[];
  messageText: string;
  integrationId: string;
  instanceId: string; // Added: Specify which instance to send from
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
  const { customerIds, messageText, integrationId, instanceId } = params;

  console.log(`sendBroadcastService: Starting broadcast for ${customerIds.length} customers, integration ${integrationId}, instance ${instanceId}`);

  // Credentials and display name will be handled by sendTextService internally.

  // --- 2. Setup Broadcast Tracking in DB ---
  let broadcastId: string;
  let validRecipients: RecipientInfo[] = [];
  console.log("sendBroadcastService: Setting up broadcast tracking...");
  try {
    // Create Broadcast Record - Store the actual instanceId (UUID)
    const { data: broadcastData, error: broadcastInsertError } = await supabase
      .from('broadcasts')
      .insert({ message_text: messageText, integration_id: integrationId, instance_id: instanceId }) // Store the actual instanceId
      .select('id')
      .single();
    if (broadcastInsertError) throw broadcastInsertError;
    broadcastId = broadcastData.id;
    console.log(`sendBroadcastService: Created broadcast record ID: ${broadcastId}`);

    // Fetch Customer Phone Numbers
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, phone_number")
      .in("id", customerIds);
    if (customerError) throw customerError;

    const validCustomers = (customers || []).filter(
      (c): c is CustomerInfo => typeof c.phone_number === 'string' && c.phone_number.trim() !== ''
    );

    if (validCustomers.length === 0) {
      console.warn("sendBroadcastService: No valid phone numbers found for selected customers.");
      // Update broadcast status to 'completed' or 'failed'? Or handle upstream.
      return { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 };
    }
    console.log(`sendBroadcastService: Found ${validCustomers.length} customers with valid phone numbers.`);

    // Create Initial Recipient Records
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

    // Map to RecipientInfo structure
    validRecipients = (insertedRecipients || []).map(r => ({
        id: r.customer_id,
        phone_number: r.phone_number,
        recipient_id: r.id // Store the broadcast_recipients table ID
    }));
    console.log(`sendBroadcastService: Created ${validRecipients.length} recipient records.`);

  } catch (error) {
    console.error("sendBroadcastService: Error setting up broadcast tracking:", error);
    // Consider cleanup or marking broadcast as failed if setup fails midway
    throw new Error(`Failed to setup broadcast tracking: ${error instanceof Error ? error.message : String(error)}`);
  }

  // --- 3. Send Messages using sendTextService & Update Status ---
  console.log("sendBroadcastService: Starting message sending loop...");
  let successfulSends = 0;
  let failedSends = 0;

  for (const recipient of validRecipients) {
    let updatePayload: { status: string; error_message?: string | null; sent_at?: string | null } = { status: 'failed', error_message: null, sent_at: null };

    try {
      console.log(`sendBroadcastService: Calling sendTextService for ${recipient.phone_number} (Recipient ID: ${recipient.recipient_id})...`);
      // Call the reusable sendTextService
      await sendTextService({
          integrationId: integrationId,
          instance: instanceId, // Pass instanceId as 'instance' param to sendTextService
          number: recipient.phone_number,
          text: messageText,
          // Pass any relevant optional parameters if needed for broadcasts
      });
      successfulSends++;
      updatePayload = { status: 'sent', sent_at: new Date().toISOString(), error_message: null };
      console.log(`sendBroadcastService: Successfully sent to ${recipient.phone_number}.`);
    } catch (error: unknown) {
      failedSends++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      updatePayload = { status: 'failed', error_message: errorMessage, sent_at: null };
      console.error(`sendBroadcastService: Failed to send to ${recipient.phone_number}:`, errorMessage);
    }

    // Update recipient status in DB
    try {
      const { error: updateError } = await supabase
        .from('broadcast_recipients')
        .update(updatePayload)
        .eq('id', recipient.recipient_id); // Update by recipient ID
      if (updateError) {
        console.error(`sendBroadcastService: Failed to update status for recipient ${recipient.recipient_id} (${recipient.phone_number}): ${updateError.message}`);
        // Log error but continue processing other recipients
      }
    } catch (dbUpdateError) {
       console.error(`sendBroadcastService: Database error updating status for recipient ${recipient.recipient_id}:`, dbUpdateError);
    }
     // Optional: Add a small delay between requests if needed to avoid rate limiting
     // await new Promise(resolve => setTimeout(resolve, 200)); // e.g., 200ms delay
  }

  // --- 4. Finalize and Return Summary ---
  console.log(`sendBroadcastService: Broadcast complete. Success: ${successfulSends}, Failed: ${failedSends}`);
  // Optionally update the main broadcast record status to 'completed' here

  return {
    broadcastId,
    successfulSends,
    failedSends,
    totalAttempted: validRecipients.length,
  };
};
