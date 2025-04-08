import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("--- test-secrets: Function starting ---");

// Function to get API key and base URL from the integrations table
// (Copied from fetch-whatsapp-instances for reuse)
async function getIntegrationCredentials(
  supabaseClient: SupabaseClient,
  integrationId: string
): Promise<{ apiKey: string | null; baseUrl: string | null; error?: string }> {
  if (!integrationId) {
    return { apiKey: null, baseUrl: null, error: "Integration ID is required." };
  }

  try {
    console.log(`Trying to get credentials from integrations table for ID: ${integrationId}...`);
    const { data, error } = await supabaseClient
      .from('integrations')
      .select('api_key, base_url') // Select both api_key and base_url
      .eq('id', integrationId)
      .single(); // Expect a single row

    if (error) {
      console.error(`Database error fetching credentials for integration ${integrationId}:`, error);
      if (error.code === 'PGRST116') { // Handle 'No rows found' specifically
        return { apiKey: null, baseUrl: null, error: `Integration with ID ${integrationId} not found.` };
      }
      return { apiKey: null, baseUrl: null, error: `Database error: ${error.message}` };
    }

    if (data && data.api_key && data.base_url) {
      console.log(`Retrieved credentials from database for integration ${integrationId}`);
      return { apiKey: data.api_key, baseUrl: data.base_url };
    } else {
      const missing: string[] = []; // Explicitly type the array
      if (!data?.api_key) missing.push("API key");
      if (!data?.base_url) missing.push("Base URL");
      const errorMsg = `${missing.join(' and ')} not found or is null in database for integration ${integrationId}.`;
      console.log(errorMsg);
      return { apiKey: null, baseUrl: null, error: errorMsg };
    }
  } catch (dbError) {
    console.error(`Unexpected database access error for integration ${integrationId}:`, dbError);
    return { apiKey: null, baseUrl: null, error: `Unexpected database error: ${dbError.message}` };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Extract integration_id from the request body
    let integrationId: string | null = null;
    try {
      const body = await req.json();
      integrationId = body.integration_id;
      if (!integrationId || typeof integrationId !== 'string') {
        throw new Error("Missing or invalid 'integration_id' in request body.");
      }
    } catch (parseError) {
      console.error("Error parsing request body:", parseError.message);
      return new Response(JSON.stringify({ error: `Bad Request: ${parseError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Pass auth header
    );

    // Get credentials from the database
    const { apiKey, baseUrl, error: credError } = await getIntegrationCredentials(supabaseClient, integrationId);

    const responseBody = {
      EVOLUTION_API_KEY_STATUS: apiKey ? `Retrieved from DB (length: ${apiKey.length})` : `Not found in DB for ID ${integrationId} (Error: ${credError || 'Unknown'})`,
      EVOLUTION_API_URL_STATUS: baseUrl ? `Retrieved from DB: ${baseUrl}` : `Not found in DB for ID ${integrationId} (Error: ${credError || 'Unknown'})`,
    };

    // Determine status code based on whether credentials were found
    const status = (apiKey && baseUrl) ? 200 : 404;

    // Return the status of the secrets
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });

  } catch (error) {
    console.error("Error in test-secrets function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
