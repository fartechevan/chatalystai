
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
      console.error(`[${requestId}] Missing instance ID in request`);
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
      console.error(`[${requestId}] Missing API token`);
      return new Response(
        JSON.stringify({ error: 'API token is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Call the Evolution API - Use POST method as required by Evolution API documentation
    const evolutionApiUrl = `https://api.evoapicloud.com/instance/connect/${instanceId}`;
    console.log(`[${requestId}] Calling Evolution API: ${evolutionApiUrl}`);
    console.log(`[${requestId}] Using token: ${token.substring(0, 5)}...`);
    
    const response = await fetch(evolutionApiUrl, {
      method: 'POST', // Changed from GET to POST as required by Evolution API
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[${requestId}] Evolution API response status: ${response.status}`);
    
    // Try to get the response content regardless of status code for better debugging
    let responseContent;
    try {
      responseContent = await response.text();
      console.log(`[${requestId}] Response content: ${responseContent}`);
    } catch (e) {
      console.error(`[${requestId}] Failed to read response content: ${e}`);
    }
    
    if (!response.ok) {
      console.error(`[${requestId}] Evolution API error: ${response.status}`);
      
      // Try to parse the error as JSON if possible
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseContent);
      } catch (e) {
        errorDetails = { raw: responseContent };
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Evolution API returned ${response.status}`,
          details: errorDetails
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse the successful response
    let data;
    try {
      data = JSON.parse(responseContent);
      console.log(`[${requestId}] Parsed response data:`, JSON.stringify(data));
    } catch (e) {
      console.error(`[${requestId}] Failed to parse response JSON: ${e}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse API response', 
          details: responseContent
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Success response
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
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
