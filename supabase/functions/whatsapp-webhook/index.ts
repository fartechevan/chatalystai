// Note: The 'std/http/server.ts' module not found error (TS Linter) is likely an LSP/linting
// environment issue. The import map 'supabase/functions/import_map.json' is correctly configured
// for Deno runtime.
import { serve } from "std/http/server.ts"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { SupabaseClient } from "@supabase/supabase-js"; // Added for typing supabaseClient
// Import both client creation functions
import { createSupabaseClient, createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";

// Define ProviderResponse interface locally for now
interface ProviderResponse {
  success: boolean;
  provider_message_id?: string;
  error_message?: string;
}

import { handleMessageEvent, WhatsAppMessageData } from "./messageHandler.ts";
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

  let supabaseClient: SupabaseClient; // Typed supabaseClient

  try {
    // 1. Parse and Validate Webhook Payload
    const payload = await parseAndValidateWebhookRequest(req);
    const { event, instance, data } = payload;
    console.log(`[${requestId}] Parsed webhook: Event=${event}, Instance=${instance}`);

    // 2. Create Supabase Service Role Client (needed for DB operations within this function)
    // We will use this client specifically for invoking other functions as well.
    supabaseClient = createSupabaseServiceRoleClient();

    // --- Fetch Global N8N/Reply Configuration ---
    // This block is removed as global reply instance configuration is no longer used.
    // Per-agent reply_evolution_instance_id is now mandatory for replies.
    // const evolutionInstanceIdForReply = n8nConfigDataFromDb?.selected_evolution_instance_id ?? null; 
    // console.log(`[${requestId}] Global N8N/Reply Config: ID='${n8nConfigDataFromDb?.id || 'N/A'}', GlobalN8NEnabled=${isGlobalN8nEnabled}, GlobalN8N_URL='${globalN8nWebhookUrl || 'N/A'}', EvolutionReplyInstanceID='${evolutionInstanceIdForReply || 'N/A'}'`);

    // --- Extract common message details ---
    const incomingMessageData = payload.data as WhatsAppMessageData;
    const isFromUser = incomingMessageData?.key?.fromMe === false;
    const isActualMessageEvent = event === 'messages.upsert' && incomingMessageData?.message;
    let messageContent = '';
    if (isActualMessageEvent && incomingMessageData?.message) {
      if (typeof incomingMessageData.message.conversation === 'string') {
        messageContent = incomingMessageData.message.conversation;
      } else if (
        incomingMessageData.message.extendedTextMessage && // Check if extendedTextMessage exists
        typeof incomingMessageData.message.extendedTextMessage === 'object' &&
        typeof (incomingMessageData.message.extendedTextMessage as { text?: string }).text === 'string' // Type assertion for text property
      ) {
        messageContent = (incomingMessageData.message.extendedTextMessage as { text: string }).text;
      }
    }
    let phoneNumber = incomingMessageData?.key?.remoteJid || '';
    if (phoneNumber.includes('@')) {
      phoneNumber = phoneNumber.split('@')[0];
    }
    const originalSenderJid = incomingMessageData?.key?.remoteJid; // Full JID for replies

    console.log(`[${requestId}] Message Details: Event='${event}', IsFromUser=${isFromUser}, HasMessageObject=${!!incomingMessageData?.message}, Content='${messageContent.substring(0,50)}...', SenderJID='${originalSenderJid}'`);

    // Define a type for expected N8N agent/global response (moved to higher scope)
    interface N8nAgentResponse {
      output?: string;
      [key: string]: unknown; // Changed 'any' to 'unknown' for better type safety
    }

    // Interface for the response from the 'query-agent' function
    interface QueryAgentResponse {
      response?: string;
      [key: string]: unknown; // Use 'unknown' for other potential properties
    }
    
    // Global N8N Integration block removed as N8N handling is now consolidated
    // under AI Agents of type 'n8n'.
    // The 'n8n_integration_config' table is still used for 'selected_evolution_instance_id'
    // for sending replies, but its 'webhook_url' and 'enable_disable' fields
    // for global N8N forwarding are no longer used by this function's forwarding logic.

    // 3. Store Webhook Event (async, non-blocking, best effort) - Use service role client
    // This will run if N8N (Global or AI Agent N8N) is not enabled or not configured, or if they don't handle the message.
    storeWebhookEventDb(supabaseClient, payload).catch(err => {
        console.error(`[${requestId}] Background webhook event storage failed:`, err);
    });

    // 4. Handle Specific Message Events (messages.upsert or send.message)
    let processingResult: true | string = true; // Default to success for unhandled events
    // Check if the event is one we want to process for messages and if data exists
    if ((event === 'messages.upsert' || event === 'send.message') && data) {
      console.log(`[${requestId}] Processing ${event} event...`);
      // Assuming handleMessageEvent contains the core logic for these event types
      // It should return true on success, or an error message string on failure.
      // It uses the 'fromMe' flag within the data payload to distinguish direction.
      // Perform type assertion for the 'data' payload before passing
      processingResult = await handleMessageEvent(supabaseClient, data as WhatsAppMessageData, instance);
      console.log(`[${requestId}] Message event processing result: ${processingResult === true ? 'Success' : 'Failed ('+processingResult+')'}`);
    } else {
      console.log(`[${requestId}] Skipping specific handling for event type: ${event}`);
    }

    // 5. Construct and Return Response
    // Always return 200 OK to acknowledge webhook receipt,
    // include processing status in the body.
    const finalMessage = "Webhook received and processed.";
    const overallSuccess = processingResult === true; // Base success on handleMessageEvent

    const responseBody = overallSuccess
        ? { success: true, processed: true, message: finalMessage }
        : { success: true, processed: false, error: `Main processing failed: ${processingResult}. ${finalMessage.replace("Webhook received and processed.", "Details:")}` };

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
