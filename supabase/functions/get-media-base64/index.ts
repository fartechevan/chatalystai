import { corsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // Use import map alias

console.log("get-media-base64 function initializing");

interface RequestPayload {
  messageId: string;
  integrationsConfigId: string; // Changed from instanceName
}

// Create a Supabase client with the Auth context of the logged in user.
// This is for accessing the database from within the function.
// Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.
// For service_role key, use SUPABASE_SERVICE_ROLE_KEY.
// Here, we might need service_role if RLS prevents anon key from reading integrations/integrations_config.
// For simplicity, assuming anon key has read access or RLS is permissive for these tables.
// If not, this client needs to be created with the service role key.
let supabaseAdmin: SupabaseClient;

try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY"); // Or SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase URL or Anon Key not provided in environment variables.");
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized for get-media-base64.");
} catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    // If Supabase client fails to init, the function can't operate.
    // Deno.serve will still run, but DB calls will fail.
}


Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as RequestPayload;
    const { messageId, integrationsConfigId } = payload;

    if (!messageId || !integrationsConfigId) {
      return new Response(JSON.stringify({ error: 'messageId and integrationsConfigId are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (!supabaseAdmin) {
      console.error("Supabase client not initialized. Cannot proceed.");
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase client failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 1. Fetch integrations_config record
    const { data: configData, error: configError } = await supabaseAdmin
      .from('integrations_config')
      .select('instance_id, integration_id')
      .eq('id', integrationsConfigId)
      .single();

    if (configError || !configData) {
      console.error(`Error fetching integrations_config for ID ${integrationsConfigId}:`, configError);
      return new Response(JSON.stringify({ error: `Failed to fetch integration config: ${configError?.message || 'Not found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const { instance_id: instanceName, integration_id: mainIntegrationId } = configData;

    if (!instanceName || !mainIntegrationId) {
        console.error(`instance_id or integration_id missing in integrations_config ${integrationsConfigId}`);
        return new Response(JSON.stringify({ error: 'Incomplete integration configuration (missing instance or main integration link)' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    // 2. Fetch the integration record for API URL and Key
    const { data: integrationDetails, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('base_url, api_key')
      .eq('id', mainIntegrationId)
      .single();

    if (integrationError || !integrationDetails) {
      console.error(`Error fetching integration details for ID ${mainIntegrationId}:`, integrationError);
      return new Response(JSON.stringify({ error: `Failed to fetch integration details: ${integrationError?.message || 'Not found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    
    const evolutionApiUrl = integrationDetails.base_url;
    const evolutionApiKey = integrationDetails.api_key;

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error("Evolution API URL or Key missing from fetched integration details.");
      return new Response(JSON.stringify({ error: 'Server configuration error: API URL or Key not found in DB' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const apiUrl = `${evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
    console.log(`Calling Evolution API: ${apiUrl} for message ID: ${messageId}`);

    const evoResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId,
          },
        },
      }),
    });

    if (!evoResponse.ok) {
      const errorBody = await evoResponse.text();
      console.error(`Evolution API error: ${evoResponse.status} ${evoResponse.statusText}`, errorBody);
      return new Response(JSON.stringify({ error: `Failed to fetch media from Evolution API: ${errorBody}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: evoResponse.status,
      });
    }

    const responseData = await evoResponse.json();
    console.log("Successfully fetched base64 data from Evolution API.");

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in get-media-base64 function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
