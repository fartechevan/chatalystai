
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { handleFetchInstances, handleConnect, handleConnectionState } from "./handlers/instanceHandlers.ts";

serve(async (req) => {
  // Generate a unique ID for this request for tracking in logs
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting integrations request processing`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      body = {};
    }

    const { integration_id, action, instanceId, apiKey } = body;

    console.log(`[${requestId}] Request parameters - integration_id: ${integration_id}, action: ${action}`);

    // Handle GET requests for fetching instances
    if (req.method === 'GET') {
      console.log(`[${requestId}] Processing GET request to fetch instances`);
      return await handleFetchInstances();
    }

    // Handle different actions based on the 'action' parameter
    switch (action) {
      case 'connect':
        console.log(`[${requestId}] Processing connect action for instance: ${instanceId}`);
        return await handleConnect(instanceId, apiKey);
        
      case 'connectionState':
        console.log(`[${requestId}] Processing connectionState action for instance: ${instanceId}`);
        return await handleConnectionState(instanceId, apiKey);
        
      default:
        console.log(`[${requestId}] Processing default action (fetch instances) with integration_id: ${integration_id}`);
        return await handleFetchInstances(integration_id);
    }
  } catch (error) {
    console.error(`Error in integrations function:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred', 
        stack: error.stack 
      }),
      { 
        status: 200, // Return 200 to prevent client side rejection, but include error in body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
