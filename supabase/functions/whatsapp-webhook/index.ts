// Note: The 'std/http/server.ts' module not found error (TS Linter) is likely an LSP/linting
// environment issue. The import map 'supabase/functions/import_map.json' is correctly configured
// for Deno runtime.
import { serve } from "std/http/server.ts"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { SupabaseClient } from "@supabase/supabase-js"; // Added for typing supabaseClient
// Import both client creation functions
import { createSupabaseClient, createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
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

    // --- AI Agent Integration Start ---
    // Define a simple type for AI Agent data needed here
    interface ActiveAIAgent {
      id: string;
      agent_type: 'chattalyst' | 'n8n';
      n8n_webhook_url: string | null;
      keyword_trigger: string | null;
      activation_mode: 'keyword' | 'always_on' | null;
      // reply_evolution_instance_id is removed, reply will use incoming instance
    }

    if (isFromUser && isActualMessageEvent && messageContent) {
      console.log(`[${requestId}] Checking for AI Agent handling for message: "${messageContent}"`);
      try {
        const { data: activeAgents, error: agentFetchError } = await supabaseClient
          .from('ai_agents')
          .select('id, agent_type, n8n_webhook_url, keyword_trigger, activation_mode') // Removed reply_evolution_instance_id
          .eq('is_enabled', true)
          .order('created_at', { ascending: true }); // Process older agents first or define priority

        if (agentFetchError) {
          console.error(`[${requestId}] Error fetching active AI agents:`, agentFetchError.message);
        } else if (activeAgents && activeAgents.length > 0) {
          console.log(`[${requestId}] Found ${activeAgents.length} active AI agents to evaluate.`);
          let matchedAgent: ActiveAIAgent | null = null;

          // 1. Check for keyword-triggered agents
          for (const agent of activeAgents as ActiveAIAgent[]) {
            if (agent.activation_mode === 'keyword' && agent.keyword_trigger && messageContent.toLowerCase().includes(agent.keyword_trigger.toLowerCase())) {
              matchedAgent = agent;
              console.log(`[${requestId}] Matched keyword agent: ID=${agent.id}, Keyword='${agent.keyword_trigger}'`);
              break;
            }
          }

          // 2. If no keyword agent matched, check for 'always_on' agents
          if (!matchedAgent) {
            for (const agent of activeAgents as ActiveAIAgent[]) {
              if (agent.activation_mode === 'always_on') {
                matchedAgent = agent;
                console.log(`[${requestId}] Matched 'always_on' agent: ID=${agent.id}`);
                break; // Take the first 'always_on' agent found
              }
            }
          }

          if (matchedAgent) {
            console.log(`[${requestId}] Processing with AI Agent ID: ${matchedAgent.id}, Type: ${matchedAgent.agent_type}`);
            let agentReplyText: string | null = null;
            let agentProcessingError: string | null = null;

            if (matchedAgent.agent_type === 'chattalyst') {
              console.log(`[${requestId}] Invoking 'query-agent' for Chattalyst agent ID: ${matchedAgent.id}`);
              const { data: invokeData, error: queryAgentError } = await supabaseClient.functions.invoke('query-agent', {
                body: { agentId: matchedAgent.id, query: messageContent },
              });

              if (queryAgentError) {
                agentProcessingError = `Error invoking query-agent: ${queryAgentError.message || JSON.stringify(queryAgentError)}`;
                console.error(`[${requestId}] ${agentProcessingError}`);
              } else {
                // Safely access .response, converting undefined to null for agentReplyText
                const queryAgentResponseObject = invokeData as QueryAgentResponse | null;
                const responseValue = queryAgentResponseObject?.response; // This will be string | undefined

                agentReplyText = responseValue ?? null; // Converts string to string, undefined to null

                if (agentReplyText) {
                  console.log(`[${requestId}] Response from 'query-agent': "${agentReplyText}"`);
                } else {
                  // agentReplyText is null here. This could be because responseValue was undefined, null, or not a string.
                  if (queryAgentResponseObject && typeof responseValue !== 'string' && responseValue !== undefined && responseValue !== null) {
                    agentProcessingError = "Query-agent returned 'response' but it was not a string or undefined/null.";
                    console.warn(`[${requestId}] ${agentProcessingError} Received response value:`, responseValue);
                  } else if (queryAgentResponseObject && !('response' in queryAgentResponseObject)) {
                    agentProcessingError = "Query-agent response data did not contain a 'response' field.";
                     console.warn(`[${requestId}] ${agentProcessingError} Data:`, queryAgentResponseObject);
                  } else if (!queryAgentResponseObject && invokeData) {
                     agentProcessingError = "Query-agent invocation returned data but it was not the expected object structure.";
                     console.warn(`[${requestId}] ${agentProcessingError} Data:`, invokeData);
                  } else if (!invokeData) {
                    // This case is fine if query-agent intentionally returns nothing for "no reply"
                    console.log(`[${requestId}] 'query-agent' did not return data or a string response, treating as no reply.`);
                  }
                  // If responseValue was undefined or null, agentReplyText is correctly null.
                }
              }
            } else if (matchedAgent.agent_type === 'n8n' && matchedAgent.n8n_webhook_url) {
              console.log(`[${requestId}] Forwarding to N8N agent webhook: ${matchedAgent.n8n_webhook_url}`);
              const formData = new FormData();
              formData.append('message', messageContent);
              formData.append('phone_number', phoneNumber); // Extracted earlier

              const n8nAgentResponse = await fetch(matchedAgent.n8n_webhook_url, {
                method: 'POST',
                body: formData,
              });

              let n8nAgentResponseData: N8nAgentResponse; // Uses N8nAgentResponse from higher scope
              const contentType = n8nAgentResponse.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                n8nAgentResponseData = await n8nAgentResponse.json() as N8nAgentResponse;
              } else {
                const textResponse = await n8nAgentResponse.text();
                try { 
                  n8nAgentResponseData = JSON.parse(textResponse) as N8nAgentResponse; 
                } catch (e) { 
                  if (typeof textResponse === 'string') n8nAgentResponseData = { output: textResponse };
                  else n8nAgentResponseData = { output: "Received non-JSON response from N8N Agent", raw: textResponse };
                }
              }
              console.log(`[${requestId}] Response from N8N Agent:`, n8nAgentResponseData);
              agentReplyText = n8nAgentResponseData?.output ?? null; // Converts undefined to null
              if (!agentReplyText) { // This check is now for if it's null (after being undefined or explicitly null)
                 agentProcessingError = "N8N Agent did not return an 'output' field or it was null.";
                 console.warn(`[${requestId}] ${agentProcessingError}`);
              }
            } else {
               agentProcessingError = `Agent type ${matchedAgent.agent_type} not supported or n8n_webhook_url missing.`;
               console.warn(`[${requestId}] ${agentProcessingError}`);
            }

            // Use the 'instance' (name) from the webhook payload to find the 'integration_id' (UUID)
            // This 'integration_id' will be used to send the reply.
            let replyInstanceUuid: string | null = null;
            if (instance) { // 'instance' is the display name from the webhook payload
              const { data: configLookupData, error: configLookupError } = await supabaseClient
                .from('integrations_config') 
                .select('integration_id') // This is the UUID needed by evolution-api-handler
                .eq('instance_display_name', instance) // Match by instance_display_name (e.g., 'AA')
                .single();

              if (configLookupError) {
                console.error(`[${requestId}] Error looking up integration_id from integrations_config for instance_display_name "${instance}": ${configLookupError.message}`);
                agentProcessingError = (agentProcessingError ? agentProcessingError + "; " : "") + `Failed to find configuration for reply instance display name ${instance}.`;
              } else if (configLookupData && configLookupData.integration_id) {
                replyInstanceUuid = configLookupData.integration_id;
              } else {
                console.warn(`[${requestId}] No configuration found in integrations_config for instance_display_name: ${instance}`);
                agentProcessingError = (agentProcessingError ? agentProcessingError + "; " : "") + `Configuration for reply instance display name ${instance} not found.`;
              }
            } else {
              console.warn(`[${requestId}] Instance display name missing in webhook payload, cannot determine reply instance UUID.`);
              agentProcessingError = (agentProcessingError ? agentProcessingError + "; " : "") + `Instance display name missing in payload.`;
            }

            if (agentReplyText && originalSenderJid && replyInstanceUuid) {
              console.log(`[${requestId}] Attempting to send AI Agent reply via Evolution API to ${originalSenderJid} using integration_id ${replyInstanceUuid} (derived from payload instance_display_name '${instance}'). Reply: "${agentReplyText}"`);
              try {
                const { error: evolutionError } = await supabaseClient.functions.invoke('evolution-api-handler', {
                  body: { action: 'send-text', instanceId: replyInstanceUuid, number: originalSenderJid, text: agentReplyText },
                });
                if (evolutionError) {
                  console.error(`[${requestId}] Error sending AI Agent reply via Evolution:`, evolutionError);
                  agentProcessingError = (agentProcessingError ? agentProcessingError + "; " : "") + `Evolution API error: ${evolutionError.message}`;
                } else {
                  console.log(`[${requestId}] Successfully invoked evolution-api-handler for AI Agent reply.`);
                }
              } catch (invokeError: unknown) {
                const errorMessage = invokeError instanceof Error ? invokeError.message : String(invokeError);
                console.error(`[${requestId}] Exception invoking evolution-api-handler for AI Agent reply:`, errorMessage);
                agentProcessingError = (agentProcessingError ? agentProcessingError + "; " : "") + `Evolution API invocation exception: ${errorMessage}`;
              }
            } else {
              if (!replyInstanceUuid) {
                 console.warn(`[${requestId}] Cannot send reply for agent ${matchedAgent.id} because replyInstanceUuid (integration_id) could not be determined from payload instance_display_name '${instance}'.`);
              } else {
                console.warn(`[${requestId}] Missing data to send AI Agent reply: replyText='${agentReplyText}', originalSenderJid='${originalSenderJid}', replyInstanceUuid='${replyInstanceUuid}'`);
              }
            }
            
            // Acknowledge WhatsApp, AI agent has handled it.
            return new Response(
              JSON.stringify({ success: true, message: "AI Agent processing attempted.", agent_id: matchedAgent.id, error: agentProcessingError }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          } else {
            console.log(`[${requestId}] No AI agent matched for the message.`);
          }
        } else {
          console.log(`[${requestId}] No active AI agents found in the database.`);
        }
      } catch (aiAgentError: unknown) {
        const errorMessage = aiAgentError instanceof Error ? aiAgentError.message : String(aiAgentError);
        console.error(`[${requestId}] Error during AI Agent processing:`, errorMessage);
        // Do not return error here, allow fallback to global N8N or default handling
      }
    }
    // --- AI Agent Integration End ---

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
