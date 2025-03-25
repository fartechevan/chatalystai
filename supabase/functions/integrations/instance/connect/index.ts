
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../../../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing WhatsApp connect request`);
    
    // Get request body
    const body = await req.json();
    const { instanceId, apiKey } = body;
    
    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: 'Instance ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Connecting to instance: ${instanceId}`);
    
    // Use the Evolution API token from the request or from environment
    const token = apiKey || Deno.env.get('EVOLUTION_API_KEY');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'API token is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Call the Evolution API
    const evolutionApiUrl = `https://api.evoapicloud.com/instance/connect/${instanceId}`;
    console.log(`[${requestId}] Calling Evolution API: ${evolutionApiUrl}`);
    
    const response = await fetch(evolutionApiUrl, {
      method: 'GET',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Evolution API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          error: `Evolution API returned ${response.status}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    console.log(`[${requestId}] Connection response:`, JSON.stringify(data));
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in WhatsApp connect endpoint:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
