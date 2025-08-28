import { corsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

console.log("get-media-base64 function initializing");

interface RequestPayload {
  messageId: string;
  integrationId: string; // This is integrations_config.id from the frontend
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

    // 1. First fetch the integrations_config to get the actual integration_id
    console.log(`[get-media-base64] Fetching integrations_config for ID: ${integrationId}`);
    const { data: configData, error: configError } = await supabaseAdmin
      .from('integrations_config')
      .select('integration_id, instance_id, instance_display_name')
      .eq('id', integrationId) // integrationId is integrations_config.id from frontend
      .single();
    
    if (configError || !configData) {
      console.error(`Error fetching integrations_config for ID ${integrationId}:`, configError);
      return new Response(JSON.stringify({ error: `Failed to fetch integration config: ${configError?.message || 'Not found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    
    // 2. Now fetch the integration details using the actual integration_id
    console.log(`[get-media-base64] Fetching integration details for integration_id: ${configData.integration_id}`);
    const { data: integrationDetails, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('base_url, api_key')
      .eq('id', configData.integration_id) // Use the actual integration_id
      .single();

    if (integrationError || !integrationDetails) {
      console.error(`Error fetching integration details for integration_id ${configData.integration_id}:`, integrationError);
      return new Response(JSON.stringify({ error: `Failed to fetch integration details: ${integrationError?.message || 'Not found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    
    const evolutionApiUrl = integrationDetails.base_url;
    const evolutionApiKey = integrationDetails.api_key;

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error("Evolution API URL or Key missing from integration details");
      return new Response(JSON.stringify({ error: 'Server configuration error: API URL or Key not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 3. Use instance_display_name or instance_id for the API call
    const instanceNameForApi = configData.instance_display_name || configData.instance_id;

    if (!instanceNameForApi) {
       console.error(`Instance identifier missing in config data:`, configData);
       return new Response(JSON.stringify({ error: 'Instance identifier missing in configuration' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // URL-encode the instance name in case it contains spaces or special characters
    const encodedInstanceName = encodeURIComponent(instanceNameForApi);

    console.log(`Using instance name '${instanceNameForApi}' (encoded: '${encodedInstanceName}')`);
    
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
