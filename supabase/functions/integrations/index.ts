
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EVO_API_BASE_URL = 'https://api.evoapicloud.com'; // Extracted base URL

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key');
  Deno.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request URL and body
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle different paths and methods
    if (path.includes('/message/sendText/')) {
      // Process WhatsApp send message request
      return await handleSendWhatsAppMessage(req);
    } else if (req.method === 'GET' && path.includes('/instance/fetchInstances')) {
      return await handleFetchInstances();
    } else if (req.method === 'GET' && path.includes('/instance/connectionState/')) {
      const instanceId = path.split('/').pop();
      return await handleConnectionState(instanceId);
    } else if (req.method === 'GET' && path.includes('/instance/connect/')) {
      const instanceId = path.split('/').pop();
      return await handleConnect(instanceId);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request path or method' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Unhandled error in request processing:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to fetch integration config
async function getIntegrationConfig(integrationId = 'bda44db7-4e9a-4733-a9c7-c4f5d7198905') {
  const { data: integration, error: integrationError } = await supabaseClient
    .from('integrations_config')
    .select('api_key, instance_id')
    .eq('id', integrationId)
    .single();

  if (integrationError) {
    console.error('Error fetching integration config:', integrationError);
    throw new Error('Failed to fetch integration configuration');
  }

  if (!integration || !integration.api_key) {
    console.error('Integration config not found or missing API key');
    throw new Error('Integration configuration not found or incomplete');
  }

  return integration;
}

// Handler for WhatsApp message sending
async function handleSendWhatsAppMessage(req) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);
    
    // Extract instance ID from request body if provided, otherwise use default
    const { instanceId, number, text } = body;
    
    if (!instanceId || !number || !text) {
      console.error('Missing required parameters', { instanceId, number, text });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: instanceId, number, or text' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get API key from integration config
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;

    // Prepare request to Evolution API
    const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instanceId}`;
    console.log('Sending request to Evolution API:', apiUrl);
    
    const options = {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: number,
        options: {
          delay: 1200
        },
        textMessage: {
          text: text
        }
      })
    };

    console.log('Request options:', JSON.stringify(options, null, 2));
    
    // Send request to Evolution API
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    
    console.log('Evolution API response:', data);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleSendWhatsAppMessage:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send WhatsApp message' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handler for fetching WhatsApp instances
async function handleFetchInstances() {
  try {
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;
    
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };

    const response = await fetch(`${EVO_API_BASE_URL}/instance/fetchInstances`, options);
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleFetchInstances:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handler for checking connection state
async function handleConnectionState(instanceId) {
  try {
    if (!instanceId) {
      throw new Error('Instance ID is required');
    }
    
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;
    
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };
    
    const apiUrl = `${EVO_API_BASE_URL}/instance/connectionState/${instanceId}`;
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleConnectionState:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handler for connecting to WhatsApp
async function handleConnect(instanceId) {
  try {
    if (!instanceId) {
      throw new Error('Instance ID is required');
    }
    
    const integration = await getIntegrationConfig();
    const apiKey = integration.api_key;
    
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };
    
    const apiUrl = `${EVO_API_BASE_URL}/instance/connect/${instanceId}`;
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    );
  } catch (error) {
    console.error('Error in handleConnect:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
