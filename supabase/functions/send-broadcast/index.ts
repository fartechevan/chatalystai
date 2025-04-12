import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Customer {
  id: string;
  phone_number: string | null;
  name?: string; // Optional: Include name if available/needed
}

interface BroadcastPayload {
  customerIds: string[];
  messageText: string;
  integrationId: string; // Add integrationId to payload
}

// Helper to get Evolution API credentials securely from env vars or secrets
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"; // Import type

// IMPORTANT: Assumes SUPABASE_URL, SUPABASE_ANON_KEY, and EVOLUTION_API_KEY_SECRET_NAME are set in Supabase project settings
async function getEvolutionCredentials(supabaseAdmin: SupabaseClient, integrationId: string): Promise<{ apiKey: string; baseUrl: string }> { // Typed supabaseAdmin
  // 1. Get Base URL from integrations table
   const { data: integrationData, error: integrationError } = await supabaseAdmin
    .from('integrations')
    .select('base_url')
    .eq('id', integrationId)
    .single();

  if (integrationError) throw new Error(`Error fetching integration base URL: ${integrationError.message}`);
  if (!integrationData?.base_url) throw new Error(`Base URL not found for integration ${integrationId}`);
  const baseUrl = integrationData.base_url;


  // 2. Get API Key from secrets (using a placeholder secret name)
  //    Replace 'EVOLUTION_API_KEY_SECRET_NAME' with the actual name of the secret storing the API key
   const { data: secretData, error: secretError } = await supabaseAdmin.rpc('get_secret', {
      secret_name: 'EVOLUTION_API_KEY' // Use the actual secret name
   });

   if (secretError) throw new Error(`Error fetching secret: ${secretError.message}`);
   if (!secretData) throw new Error(`Secret 'EVOLUTION_API_KEY' not found or empty.`); // Adjust secret name in error

   return { apiKey: secretData, baseUrl };
}


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: BroadcastPayload = await req.json();
    const { customerIds, messageText, integrationId } = payload; // Destructure integrationId

    if (!customerIds || customerIds.length === 0 || !messageText || !integrationId) {
      return new Response(JSON.stringify({ error: "Missing customerIds, messageText, or integrationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key for backend operations
    // IMPORTANT: Ensure SUPABASE_SERVICE_ROLE_KEY is set in Edge Function environment variables
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Use Service Role Key
    );

    // --- Start Broadcast Tracking ---

    // 1. Fetch instance_id using the provided integrationId
    const { data: configData, error: configError } = await supabaseAdmin
      .from('integrations_config')
      .select('instance_id')
      .eq('integration_id', integrationId)
      .maybeSingle(); // Use maybeSingle to handle potential null

    if (configError && configError.code !== 'PGRST116') { // Ignore 'No rows found' error initially
        throw new Error(`Error fetching instance config: ${configError.message}`);
    }
    const instanceId = configData?.instance_id;
    if (!instanceId) {
        throw new Error(`No instance configured for integration ${integrationId}.`);
    }

    // 2. Create Broadcast Record
    const { data: broadcastData, error: broadcastInsertError } = await supabaseAdmin
      .from('broadcasts')
      .insert({
        message_text: messageText,
        integration_id: integrationId,
        instance_id: instanceId,
      })
      .select('id') // Select the ID of the newly created broadcast
      .single(); // Expect a single row back

    if (broadcastInsertError) throw new Error(`Error creating broadcast record: ${broadcastInsertError.message}`);
    const broadcastId = broadcastData.id;

    // 3. Fetch Customer Details (ID and Phone Number)
    const { data: customers, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, phone_number") // Select only needed fields
      .in("id", customerIds);

    if (customerError) throw new Error(`Error fetching customer details: ${customerError.message}`);

    const validCustomers = (customers || []).filter(
      (c: Customer): c is Customer & { phone_number: string } =>
        typeof c.phone_number === 'string' && c.phone_number.trim() !== ''
    );

    if (validCustomers.length === 0) {
      // Update broadcast status if needed, or just return
      return new Response(JSON.stringify({ warning: "No valid phone numbers found for selected customers.", broadcastId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Create Initial Recipient Records (Pending)
    const recipientRecords = validCustomers.map(c => ({
      broadcast_id: broadcastId,
      customer_id: c.id,
      phone_number: c.phone_number,
      status: 'pending', // Initial status
    }));

    const { data: insertedRecipients, error: recipientInsertError } = await supabaseAdmin
      .from('broadcast_recipients')
      .insert(recipientRecords)
      .select('id, phone_number, customer_id'); // Select needed info for updates

    if (recipientInsertError) throw new Error(`Error creating recipient records: ${recipientInsertError.message}`);

    // --- End Broadcast Tracking Setup ---

    // 5. Fetch Evolution API credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(supabaseAdmin, integrationId);
    const evolutionApiUrl = `${baseUrl}/message/sendText/${instanceId}`;

    // 6. Send messages sequentially and update recipient status
    let successfulSends = 0;
    let failedSends = 0;

    for (const recipient of insertedRecipients || []) {
      const evolutionPayload = { number: recipient.phone_number, text: messageText };
      let updatePayload: { status: string; error_message?: string; sent_at?: string } = { status: 'failed' };

      try {
        const response = await fetch(evolutionApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
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
      } catch (error: unknown) { // Type catch error as unknown
        failedSends++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        updatePayload = { status: 'failed', error_message: errorMessage };
        console.error(`Failed to send broadcast to ${recipient.phone_number}:`, errorMessage);
      }

      // Update the recipient record status
      const { error: updateError } = await supabaseAdmin
        .from('broadcast_recipients')
        .update(updatePayload)
        .eq('id', recipient.id); // Update by recipient ID

      if (updateError) {
        console.error(`Failed to update status for recipient ${recipient.id} (${recipient.phone_number}): ${updateError.message}`);
        // Decide how to handle this - maybe retry or log prominently
      }
    }

    // 7. Return summary including the broadcast ID
    return new Response(JSON.stringify({
      broadcastId, // Include the ID of the created broadcast
      successfulSends,
      failedSends,
      totalAttempted: validCustomers.length,
      // Optionally include detailed results if needed by frontend
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Broadcast function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
