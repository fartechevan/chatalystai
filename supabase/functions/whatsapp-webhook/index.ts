
// @deno-types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts"
import { serve } from "std/http/server.ts"; // Use import map alias
import { createClient } from "@supabase/supabase-js"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { handleMessageEvent } from "./messageHandler.ts"
import { createErrorResponse } from "./utils.ts"

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received ${req.method} request to WhatsApp webhook`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const requestId = crypto.randomUUID();
      console.log(`[${requestId}] Processing webhook request`);
      
      // Log the raw request for debugging
      const rawBody = await req.clone().text();
      console.log(`[${requestId}] Raw request body:`, rawBody);
      
      let body;
      try {
        // Parse the JSON body
        body = JSON.parse(rawBody);
        console.log(`[${requestId}] Parsed webhook payload:`, JSON.stringify(body, null, 2));
      } catch (parseError) {
        console.error(`[${requestId}] Error parsing webhook JSON:`, parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Extract relevant data from the webhook
      const { event, data, instance } = body;
      console.log(`[${requestId}] Received ${event} event from instance ${instance}`);

      if (!event || !instance) {
        console.error(`[${requestId}] Missing required fields in webhook payload`);
        return new Response(
          JSON.stringify({ error: 'Missing required fields: event or instance' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Create Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Store the webhook event in evolution_webhook_events table
      const { error: webhookError } = await supabaseClient
        .from('evolution_webhook_events')
        .insert({
          event_type: event,
          payload: body,
          processing_status: 'pending',
          source_identifier: instance
        });

      if (webhookError) {
        console.error(`[${requestId}] Error storing webhook event:`, webhookError);
      } else {
        console.log(`[${requestId}] Successfully stored webhook event`);
      }
      
      // If this is a message event, handle conversation linking
      let processingResult: true | string = true; // Default to success for non-message events
      if (event === 'messages.upsert' && data) {
        console.log(`[${requestId}] Processing messages.upsert event`);
        processingResult = await handleMessageEvent(supabaseClient, data, instance); // Returns true or error string
        console.log(`[${requestId}] Message event processing result:`, processingResult);
      } else {
        console.log(`[${requestId}] Skipping event handling for non-message event: ${event}`);
        // For non-message events, consider processing successful by default
        processingResult = true; 
      }

      // Construct response body based on processing result
      let responseBody: { success: boolean; processed: boolean; error?: string };
      if (processingResult === true) {
        responseBody = { success: true, processed: true };
      } else {
        // processingResult is an error string
        responseBody = { success: true, processed: false, error: processingResult };
      }

      console.log(`[${requestId}] Webhook processing completed. Response:`, JSON.stringify(responseBody));
      
      // Return response (still 200 OK, but body contains error details if processing failed)
      return new Response(
        JSON.stringify(responseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Return method not allowed for non-POST requests
    console.log('Received non-POST request to webhook endpoint');
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    );

  } catch (error) {
    console.error('Unhandled error in webhook processing:', error);
    return createErrorResponse(error);
  }
});
