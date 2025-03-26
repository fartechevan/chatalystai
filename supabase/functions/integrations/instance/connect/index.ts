
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../../../_shared/cors.ts";

serve(async (req) => {
  // Generate a unique ID for this request for tracking in logs
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting WhatsApp connect request processing`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] Processing WhatsApp connect request`);
    
    let requestBodyText;
    try {
      requestBodyText = await req.text();
      console.log(`[${requestId}] Raw request body: ${requestBodyText}`);
    } catch (e) {
      console.log(`[${requestId}] Error reading request body as text: ${e}`);
    }
    
    let body;
    try {
      // If we have the text version, parse it, otherwise use json()
      if (requestBodyText) {
        body = JSON.parse(requestBodyText);
      } else {
        body = await req.json();
      }
      console.log(`[${requestId}] Parsed request body:`, body);
    } catch (e) {
      console.error(`[${requestId}] Error parsing request body:`, e);
      return new Response(
        JSON.stringify({ error: 'Failed to parse request body' }),
        { 
          status: 200, // Use 200 even for errors to prevent client rejection
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { instanceId, apiKey } = body;
    
    if (!instanceId) {
      console.error(`[${requestId}] Missing instance ID in request`);
      return new Response(
        JSON.stringify({ error: 'Instance ID is required' }),
        { 
          status: 200, // Use 200 even for errors to prevent client rejection
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Connecting to instance: ${instanceId}`);
    console.log(`[${requestId}] API key provided: ${apiKey ? 'Yes' : 'No'}`);
    
    // Use the Evolution API token from the request or from environment
    const token = apiKey || Deno.env.get('EVOLUTION_API_KEY');
    
    if (!token) {
      console.error(`[${requestId}] No API token available`);
      return new Response(
        JSON.stringify({ error: 'API token is required and not found in request or environment' }),
        { 
          status: 200, // Use 200 even for errors to prevent client rejection
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Call the Evolution API - Use POST method as required by Evolution API documentation
    const evolutionApiUrl = `https://api.evoapicloud.com/instance/connect/${instanceId}`;
    console.log(`[${requestId}] Calling Evolution API: ${evolutionApiUrl}`);
    console.log(`[${requestId}] Using token: ${token.substring(0, 5)}...`);
    
    const fetchOptions = {
      method: 'POST', // Using POST as specified in Evolution API docs
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      // Adding an empty body as some APIs require this even with POST requests
      body: JSON.stringify({})
    };
    console.log(`[${requestId}] Fetch options:`, JSON.stringify(fetchOptions, (key, value) => 
      key === 'apikey' ? value.substring(0, 5) + '...' : value, 2));
    
    let response;
    try {
      response = await fetch(evolutionApiUrl, fetchOptions);
      console.log(`[${requestId}] Evolution API response status: ${response.status}`);
      console.log(`[${requestId}] Evolution API response headers:`, JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
    } catch (fetchError) {
      console.error(`[${requestId}] Fetch error when calling Evolution API:`, fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to Evolution API', 
          details: fetchError.message
        }),
        { 
          status: 200, // Use 200 even for errors to prevent client rejection
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Try to get the response content regardless of status code for better debugging
    let responseContent = '';
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
      console.log(`[${requestId}] Parsed response data:`, JSON.stringify(data, null, 2));
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
    console.log(`[${requestId}] Successfully processed connect request`);
    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unhandled error in WhatsApp connect endpoint:`, error);
    
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
