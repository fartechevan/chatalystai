
import { corsHeaders } from "../../../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing WhatsApp connection state check`);
    
    // Get request body
    const body = await req.json();
    const { instanceId, apiKey } = body;
    
    if (!instanceId) {
      console.error(`[${requestId}] Missing instance ID in request`);
      return new Response(
        JSON.stringify({ error: 'Instance ID is required' }),
        { 
          status: 200, // Return 200 to prevent client side rejection, but include error in body
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Checking connection state for instance: ${instanceId}`);
    
    // Use the API key from the request instead of environment variable
    const token = apiKey;
    
    if (!token) {
      console.error(`[${requestId}] Missing API token in request`);
      return new Response(
        JSON.stringify({ error: 'API token is required' }),
        { 
          status: 200, // Return 200 to prevent client side rejection, but include error in body
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Call the Evolution API to check connection state
    const evolutionApiUrl = `https://api.evoapicloud.com/instance/connectionState/${instanceId}`;
    console.log(`[${requestId}] Calling Evolution API: ${evolutionApiUrl}`);
    console.log(`[${requestId}] Using token: ${token.substring(0, 5)}...`);
    
    const response = await fetch(evolutionApiUrl, {
      method: 'GET',
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
          status: 200, // Return 200 to prevent client side rejection, but include error in body
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
          status: 200, // Return 200 to prevent client side rejection, but include error in body
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
    console.error('Error in WhatsApp connection state check endpoint:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        stack: error.stack
      }),
      { 
        status: 200, // Return 200 to prevent client side rejection, but include error in body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
