import { corsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // Use import map alias

console.log("get-media-base64 function initializing");

interface RequestPayload {
  messageId: string;
  integrationId: string; // Expecting FK to 'integrations' table
}

let supabaseAdmin: SupabaseClient;

try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase URL or Service Role Key not provided in environment variables.");
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized for get-media-base64 (using service role).");
    // Log to confirm service key presence (DO NOT log the key itself)
    if (supabaseServiceKey && supabaseServiceKey.length > 20) { // Basic check
      console.log("Service role key appears to be loaded by the function environment.");
    } else {
      console.error("Service role key DOES NOT appear to be loaded or is too short!");
    }
} catch (e) {
    console.error("Failed to initialize Supabase client (service role):", e);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as RequestPayload;
    const { messageId, integrationId } = payload;

    if (!messageId || !integrationId) {
      return new Response(JSON.stringify({ error: 'messageId and integrationId are required' }), {
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

    // 1. Fetch the main integration record for API URL and Key using the provided integrationId
    const { data: integrationDetails, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('base_url, api_key')
      .eq('id', integrationId) // Use the provided integrationId (FK from conversations table)
      .single();

    if (integrationError || !integrationDetails) {
      console.error(`Error fetching integration details for ID ${integrationId}:`, integrationError);
      return new Response(JSON.stringify({ error: `Failed to fetch integration details: ${integrationError?.message || 'Not found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    
    const evolutionApiUrl = integrationDetails.base_url;
    const evolutionApiKey = integrationDetails.api_key;

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error("Evolution API URL or Key missing from fetched integration details for integration ID:", integrationId);
      return new Response(JSON.stringify({ error: 'Server configuration error: API URL or Key not found in DB for the given integration' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 2. Fetch the instance_id from integrations_config using the main integrationId
    console.log(`[get-media-base64] About to query 'integrations_config' for integration_id: ${integrationId}`);
    const { data: configResults, error: configQueryError } = await supabaseAdmin
      .from('integrations_config')
      .select('instance_id, id, instance_display_name')  // Select instance_display_name
      .eq('integration_id', integrationId); 
      // Removed .limit(1).single() to inspect results more broadly first

    if (configQueryError) {
      console.error(`[get-media-base64] Error querying 'integrations_config' for integration_id ${integrationId}:`, JSON.stringify(configQueryError, null, 2));
      return new Response(JSON.stringify({ error: `Database error fetching instance configuration: ${configQueryError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, 
      });
    }

    if (!configResults || configResults.length === 0) {
      console.error(`No integrations_config found for integration_id ${integrationId}. Result count: ${configResults?.length}`);
      return new Response(JSON.stringify({ error: `No instance configuration found for integration_id ${integrationId}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404, 
      });
    }
    
    if (configResults.length > 1) {
      console.warn(`Multiple integrations_config found for integration_id ${integrationId}. Using the first one. Results:`, configResults);
      // Potentially add logic here if multiple configs are valid and need specific selection
    }

    const configData = configResults[0]; // Use the first result

    // Use instance_display_name for the API path, fall back to instance_id if display name is missing
    let instanceNameForApi = configData.instance_display_name || configData.instance_id;

    if (!instanceNameForApi) {
       console.error(`Fetched integrations_config for integration_id ${integrationId}, but both instance_display_name and instance_id are missing. Config data:`, configData);
       return new Response(JSON.stringify({ error: `Instance identifier missing in fetched instance configuration for integration_id ${integrationId}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal configuration error
      });
    }
    
    // URL-encode the instance name in case it contains spaces or special characters
    const encodedInstanceName = encodeURIComponent(instanceNameForApi);

    console.log(`For integrationId ${integrationId}: Using instance name '${instanceNameForApi}' (encoded: '${encodedInstanceName}') from config. Evolution API URL: ${evolutionApiUrl}`);
    
    const apiUrl = `${evolutionApiUrl}/chat/getBase64FromMediaMessage/${encodedInstanceName}`;
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
