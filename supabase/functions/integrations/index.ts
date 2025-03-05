
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Create Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function getIntegrationConfig(configId) {
  const { data, error } = await supabaseClient
    .from('integrations_config')
    .select('*')
    .eq('id', configId)
    .single();
  
  if (error) {
    console.error('Error fetching integration config:', error);
    throw new Error('Failed to fetch integration configuration');
  }
  
  return data;
}

async function sendWhatsAppMessage(config, phoneNumber, message) {
  if (!config.instance_id || !config.api_key || !config.base_url) {
    throw new Error('Missing required configuration properties');
  }

  // Format the phone number (remove +, @c.us, etc.)
  const formattedNumber = phoneNumber.replace(/\D/g, '');
  
  // Ensure phone number is in the right format with @c.us if it's not already
  const recipient = phoneNumber.includes('@c.us') 
    ? phoneNumber 
    : `${formattedNumber}@c.us`;

  console.log(`Sending message to ${recipient} using instance ${config.instance_id}`);
  
  try {
    const apiUrl = `${config.base_url}/message/text/${config.instance_id}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key,
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200,
        },
        textMessage: {
          text: message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WhatsApp API error (${response.status}):`, errorText);
      throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('WhatsApp API response:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] ${req.method} request to integrations function`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Log the raw request body for debugging
    const rawBody = await req.clone().text();
    console.log(`[${requestId}] Raw request body:`, rawBody);

    // Parse the JSON body
    const body = await req.json();
    console.log(`[${requestId}] Parsed request body:`, JSON.stringify(body, null, 2));

    const { action, configId, data } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing required field: action' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!configId) {
      return new Response(JSON.stringify({ error: 'Missing required field: configId' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get integration configuration
    const config = await getIntegrationConfig(configId);
    
    if (action === 'send_message') {
      if (!data?.recipient || !data?.message) {
        return new Response(JSON.stringify({ error: 'Missing required fields: recipient or message' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      
      const result = await sendWhatsAppMessage(config, data.recipient, data.message);
      
      return new Response(JSON.stringify({ success: true, result }), {
        headers: corsHeaders,
      });
    }
    
    // Unsupported action
    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
