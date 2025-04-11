import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Customer {
  id: string;
  phone_number: string | null;
  // Add other fields if needed, but phone_number is key
}

interface BroadcastPayload {
  customerIds: string[];
  messageText: string;
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
    const { customerIds, messageText } = payload;

    if (!customerIds || customerIds.length === 0 || !messageText) {
      return new Response(JSON.stringify({ error: "Missing customerIds or messageText" }), {
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

    // 1. Fetch active WhatsApp integration config (integration_id and instance_id)
    const { data: integrationConfig, error: configError } = await supabaseAdmin
      .from('integrations')
      .select('id, integrations_config(instance_id)')
      .eq('type', 'whatsapp')
      .limit(1)
      .single();

    if (configError) throw new Error(`Error fetching integration config: ${configError.message}`);
    if (!integrationConfig) throw new Error("No active WhatsApp integration found.");

    // Extract instance_id correctly - it's nested
    const instanceId = integrationConfig.integrations_config?.[0]?.instance_id;
    const integrationId = integrationConfig.id;

    if (!instanceId) throw new Error(`No instance configured for integration ${integrationId}.`);

    // 2. Fetch Evolution API credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(supabaseAdmin, integrationId);
    const evolutionApiUrl = `${baseUrl}/message/sendText/${instanceId}`;

    // 3. Fetch phone numbers for selected customers
    const { data: customers, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, phone_number")
      .in("id", customerIds);

    if (customerError) throw new Error(`Error fetching customer phone numbers: ${customerError.message}`);

    const phoneNumbers = (customers || [])
      .map((c: Customer) => c.phone_number)
      .filter((pn): pn is string => typeof pn === 'string' && pn.trim() !== ''); // Ensure it's a non-empty string

    if (phoneNumbers.length === 0) {
       return new Response(JSON.stringify({ warning: "No valid phone numbers found for selected customers." }), {
         status: 200, // Or maybe 400 depending on desired behavior
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // 4. Send messages sequentially
    let successfulSends = 0;
    let failedSends = 0;
    // Explicitly type the results array
    const results: Array<{ number: string; status: 'success' | 'failed'; error?: string }> = [];

    for (const number of phoneNumbers) {
      const evolutionPayload = { number, text: messageText };
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
        results.push({ number, status: 'success' });
      } catch (error: unknown) { // Type catch error as unknown
        failedSends++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ number, status: 'failed', error: errorMessage });
        console.error(`Failed to send broadcast to ${number}:`, errorMessage);
      }
    }

    // 5. Return summary
    return new Response(JSON.stringify({ successfulSends, failedSends, totalAttempted: phoneNumbers.length, results }), {
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
