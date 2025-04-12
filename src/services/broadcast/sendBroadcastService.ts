import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface SendBroadcastParams {
  integrationId: string;
  customerIds: string[];
  messageText: string;
  // Note: Passing apiKey and baseUrl directly is a security risk!
  apiKey: string; 
  baseUrl: string;
}

interface SendBroadcastResult {
  broadcastId: string;
  successfulSends: number;
  failedSends: number;
  totalAttempted: number;
  warning?: string;
}

export const sendBroadcastService = async ({
  integrationId,
  customerIds,
  messageText,
  apiKey,
  baseUrl,
}: SendBroadcastParams): Promise<SendBroadcastResult> => {
  console.log("Starting broadcast service:", { integrationId, customerIds, messageText });

  let successfulSends = 0;
  let failedSends = 0;
  let broadcastId = '';

  try {
    // 1. Fetch Instance ID from integrations_config
    const { data: configData, error: configError } = await supabase
      .from('integrations_config')
      .select('instance_id')
      .eq('integration_id', integrationId)
      .maybeSingle();

    if (configError && configError.code !== 'PGRST116') {
      throw new Error(`Error fetching instance config: ${configError.message}`);
    }
    const instanceId = configData?.instance_id;
    if (!instanceId) {
      throw new Error(`No instance configured for integration ${integrationId}.`);
    }
    console.log("Fetched instanceId:", instanceId);

    // 2. Create Broadcast Record
    const { data: broadcastData, error: broadcastInsertError } = await supabase
      .from('broadcasts')
      .insert({
        message_text: messageText,
        integration_id: integrationId,
        instance_id: instanceId,
      })
      .select('id')
      .single();

    if (broadcastInsertError) throw new Error(`Error creating broadcast record: ${broadcastInsertError.message}`);
    broadcastId = broadcastData.id;
    console.log("Created broadcast record:", broadcastId);

    // 3. Fetch Customer Phone Numbers
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, phone_number")
      .in("id", customerIds);

    if (customerError) throw new Error(`Error fetching customer details: ${customerError.message}`);

    const validCustomers = (customers || []).filter(
      (c: Partial<Customer>): c is Customer & { phone_number: string } =>
        typeof c.phone_number === 'string' && c.phone_number.trim() !== ''
    );

    if (validCustomers.length === 0) {
      console.warn("No valid phone numbers found for selected customers.");
      // Return early, maybe update broadcast status if needed
      return { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0, warning: "No valid phone numbers found." };
    }
    console.log("Found valid customers:", validCustomers.length);

    // 4. Create Initial Recipient Records (Pending)
    const recipientRecords = validCustomers.map(c => ({
      broadcast_id: broadcastId,
      customer_id: c.id,
      phone_number: c.phone_number,
      status: 'pending',
    }));

    const { data: insertedRecipients, error: recipientInsertError } = await supabase
      .from('broadcast_recipients')
      .insert(recipientRecords)
      .select('id, phone_number'); // Select needed info for updates

    if (recipientInsertError) throw new Error(`Error creating recipient records: ${recipientInsertError.message}`);
    if (!insertedRecipients) throw new Error('Failed to get inserted recipient details.');
    console.log("Created recipient records:", insertedRecipients.length);


    // 5. Send messages sequentially via Evolution API and update status
    const evolutionApiUrl = `${baseUrl}/message/sendText/${instanceId}`;
    console.log("Evolution API URL:", evolutionApiUrl);

    for (const recipient of insertedRecipients) {
      const evolutionPayload = { number: recipient.phone_number, text: messageText };
      let updatePayload: Database['public']['Tables']['broadcast_recipients']['Update'] = { status: 'failed' };

      try {
        const response = await fetch(evolutionApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey, // Using API key directly in frontend - SECURITY RISK!
          },
          body: JSON.stringify(evolutionPayload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API Error ${response.status}: ${errorBody}`);
        }
        // const responseData = await response.json(); // Process if needed
        successfulSends++;
        updatePayload = { status: 'sent', sent_at: new Date().toISOString() };
      } catch (error: unknown) {
        failedSends++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        updatePayload = { status: 'failed', error_message: errorMessage };
        console.error(`Failed to send broadcast to ${recipient.phone_number}:`, errorMessage);
      }

      // Update the recipient record status
      const { error: updateError } = await supabase
        .from('broadcast_recipients')
        .update(updatePayload)
        .eq('id', recipient.id);

      if (updateError) {
        console.error(`Failed to update status for recipient ${recipient.id} (${recipient.phone_number}): ${updateError.message}`);
        // Potentially increment failedSends again or handle differently
      }
    }

    console.log("Broadcast sending finished:", { successfulSends, failedSends });
    return { broadcastId, successfulSends, failedSends, totalAttempted: validCustomers.length };

  } catch (error) {
    console.error("Error in sendBroadcastService:", error);
    // Rethrow or handle error appropriately for the UI
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during the broadcast.";
     // Attempt to update broadcast status to failed if possible
     if (broadcastId) {
        await supabase.from('broadcasts').update({ /* Add a status field? */ }).eq('id', broadcastId);
     }
    throw new Error(errorMessage); // Rethrow to be caught by the calling component
  }
};
