
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EVO_API_URL = "https://api.evoapicloud.com/message/sendText/";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Received request to integrations function: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.log(`[${requestId}] Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Log the raw request body
    const rawBody = await req.clone().text();
    console.log(`[${requestId}] Raw request body:`, rawBody);
    
    const body = await req.json();
    console.log(`[${requestId}] Parsed request body:`, JSON.stringify(body, null, 2));

    // Extract data from the request body
    const { number, text, instanceId, integrationsConfigId } = body;

    if (!number || !text || !instanceId || !integrationsConfigId) {
      console.log(`[${requestId}] Missing required parameters. number: ${!!number}, text: ${!!text}, instanceId: ${!!instanceId}, integrationsConfigId: ${!!integrationsConfigId}`);
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    // Fetch API key from integrations_config table
    const { data: integrationConfig, error: integrationConfigError } = await supabase
      .from('integrations_config')
      .select('api_key')
      .eq('id', integrationsConfigId)
      .single();

    if (integrationConfigError || !integrationConfig?.api_key) {
      console.error(`[${requestId}] Error fetching API key:`, integrationConfigError);
      return new Response(
        JSON.stringify({ error: "Could not find API key" }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const apiKey = integrationConfig.api_key;

    const apiUrl = EVO_API_URL + instanceId;
    console.log(`[${requestId}] Sending message to: ${apiUrl}`);

    const evoApiPayload = {
      number: number,
      text: text,
    };

    console.log(`[${requestId}] Request payload to Evolution API:`, JSON.stringify(evoApiPayload));
    
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(evoApiPayload),
    });

    console.log(`[${requestId}] Evolution API response status: ${resp.status}`);
    
    if (!resp.ok) {
      const responseText = await resp.text();
      console.error(`[${requestId}] Evolution API error: ${resp.status}`, responseText);
      return new Response(
        JSON.stringify({ error: "Failed to send message", evoApiStatus: resp.status, details: responseText }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const data = await resp.json();
    console.log(`[${requestId}] Evolution API success response:`, JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, data }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] Error in integrations function:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
