/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Updated to fully qualified URL
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts"; // Use Service Role
import { handleMessageEvent, WhatsAppMessageData } from "./messageHandler.ts"; // Import type and handler
import { createErrorResponse, parseAndValidateWebhookRequest, storeWebhookEventDb } from "./utils.ts";

serve(async (req) => {
  const requestId = crypto.randomUUID(); // Generate unique ID for logging
  console.log(`[${requestId}] ${new Date().toISOString()} Received ${req.method} request to WhatsApp webhook`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
      console.log(`[${requestId}] Received non-POST request`);
      return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
  }

  let supabaseClient; // Define here for potential use in catch block

  try {
    // 1. Parse and Validate Webhook Payload
    const payload = await parseAndValidateWebhookRequest(req);
    const { event, instance, data } = payload;
    console.log(`[${requestId}] Parsed webhook: Event=${event}, Instance=${instance}`);

    // 2. Create Supabase Service Role Client
    supabaseClient = createSupabaseServiceRoleClient();

    // 3. Store Webhook Event (async, non-blocking, best effort)
    storeWebhookEventDb(supabaseClient, payload).catch(err => {
        console.error(`[${requestId}] Background webhook event storage failed:`, err);
    });

    // 4. Handle Specific Events (e.g., messages.upsert)
    let processingResult: true | string = true; // Default to success for unhandled events
    if (event === 'messages.upsert' && data) {
      console.log(`[${requestId}] Processing messages.upsert event...`);
      // Assuming handleMessageEvent contains the core logic for this event type
      // It should return true on success, or an error message string on failure
      // Perform type assertion for the 'data' payload before passing
      processingResult = await handleMessageEvent(supabaseClient, data as WhatsAppMessageData, instance);
      console.log(`[${requestId}] Message event processing result: ${processingResult === true ? 'Success' : 'Failed ('+processingResult+')'}`);
    } else {
      console.log(`[${requestId}] Skipping specific handling for event type: ${event}`);
    }

    // 5. Construct and Return Response
    // Always return 200 OK to acknowledge webhook receipt,
    // include processing status in the body.
    const responseBody = (processingResult === true)
        ? { success: true, processed: true, message: "Webhook received and processed." }
        : { success: true, processed: false, error: `Webhook received but processing failed: ${processingResult}` };

    console.log(`[${requestId}] Webhook processing completed. Sending response.`);
    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // Catch errors from parsing or unexpected issues in the main handler
    console.error(`[${requestId}] Unhandled error in webhook processing:`, error);
    // Use the utility to create a standard error response
    // Determine status code based on error type if possible
    let status = 500;
     if (error.message === "Method Not Allowed") status = 405; // Should be caught earlier, but safe check
     if (error.message === "Invalid JSON payload") status = 400;
     if (error.message === "Missing required fields: event or instance") status = 400;
     // Add more specific error checks if needed

    return createErrorResponse(error, status);
  }
});
