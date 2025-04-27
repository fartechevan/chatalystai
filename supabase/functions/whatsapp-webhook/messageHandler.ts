
import { SupabaseClient } from "@supabase/supabase-js";
import { extractMessageContent } from "./utils.ts";
import { findOrCreateCustomer } from "./customerHandler.ts";
import { findOrCreateConversation } from "./conversationHandler.ts";
// Import PostgrestError from the Supabase client library itself, as it's often re-exported
import { PostgrestError } from "@supabase/supabase-js";

// Define types for cleaner code
interface AgentIntegrationSettings {
  agent_id: string;
  activation_mode: 'keyword' | 'always_on';
  keyword_trigger: string | null;
  stop_keywords: string[];
  session_timeout_minutes: number;
  error_message: string;
  integration_id: string; // Added integration_id
}

interface AgentSession {
  id: string;
  is_active: boolean;
  last_interaction_timestamp: string;
  conversation_history: unknown; // Use unknown instead of any
}

// Define a minimal interface for the expected message data structure
export interface WhatsAppMessageData { // Added export
  key: {
    remoteJid: string;
    fromMe?: boolean;
    id: string; // Assuming message ID is also present
  };
  pushName?: string;
  message?: Record<string, unknown>; // Use a more specific type than any
  // Add other expected fields if known
}

/**
 * Handles a WhatsApp message event
 * @returns {Promise<true | string>} Returns true on success, or an error message string on failure.
 */
export async function handleMessageEvent(supabaseClient: SupabaseClient, data: WhatsAppMessageData, instanceId: string): Promise<true | string> {
  console.log('Processing message event with data:', JSON.stringify(data, null, 2));
  
  if (!data || !data.key || !data.key.remoteJid) {
    const errorMsg = 'Invalid message data structure';
    console.error(errorMsg);
    return errorMsg;
  }

  const remoteJid = data.key.remoteJid;
  const fromMe = data.key.fromMe || false;
  const contactName = data.pushName || remoteJid.split('@')[0];
  const messageText = extractMessageContent(data);
  
  // Skip group chats (messages with @g.us)
  if (remoteJid.includes('@g.us')) {
    console.log(`Skipping group chat message from ${remoteJid}`);
    return true; // Return true to acknowledge receipt, but don't process it
  }
  
  console.log(`Processing message from ${fromMe ? 'owner' : 'customer'} ${contactName} (${remoteJid}): ${messageText}`);

  // --- Hardcoded Integration ID ---
  const hardcodedIntegrationId = '1fe47f4b-3b22-43cf-acf2-6bd3eeb0a96d';
  console.log(`Using hardcoded integration ID: ${hardcodedIntegrationId}`);

  // Get the integration config using the hardcoded integration_id
  console.log('[MessageHandler] Attempting to fetch integration config...');
  const { data: fetchedConfig, error: configError } = await supabaseClient
    .from('integrations_config')
    .select('id, user_reference_id') // Select necessary fields
    .eq('integration_id', hardcodedIntegrationId)
    .maybeSingle();

  if (configError) {
    const errorMsg = `Error fetching integration config for hardcoded ID ${hardcodedIntegrationId}: ${configError.message}`;
    console.error(errorMsg);
    return errorMsg;
  }

  if (!fetchedConfig) {
    const errorMsg = `No integration config found for hardcoded integration ID: ${hardcodedIntegrationId}`;
    console.error(errorMsg);
    return errorMsg;
  }

  // Construct the config object needed for downstream functions
  const config = {
    id: fetchedConfig.id, // Keep original config ID if needed for logging/reference
    integration_id: hardcodedIntegrationId,
    user_reference_id: fetchedConfig.user_reference_id,
  };

  console.log('Constructed integration config:', config);
  console.log(`[MessageHandler] User Reference ID from config: ${config.user_reference_id}`); // Log the crucial ID

  // Extract phone number from remoteJid
  const phoneNumber = remoteJid.split('@')[0];
  console.log(`Extracted phone number: ${phoneNumber}`);

  // Customer handling
  // Call findOrCreateCustomer regardless of fromMe value, but pass the fromMe flag
  let customerId: string | null = null;
  try {
    console.log('[MessageHandler] Calling findOrCreateCustomer...');
    customerId = await findOrCreateCustomer(supabaseClient, phoneNumber, contactName, fromMe);
    console.log(`[MessageHandler] findOrCreateCustomer returned Customer ID: ${customerId}`);
    if (!customerId) {
       const errorMsg = '[MessageHandler] findOrCreateCustomer returned null or undefined ID.';
       console.error(errorMsg);
       return errorMsg;
    }
  } catch (error) {
    const errorMsg = `[MessageHandler] Error during findOrCreateCustomer call: ${error.message}`;
    console.error(errorMsg, error);
    return errorMsg;
  }
  
  // Conversation handling
  try {
    console.log(`[MessageHandler] Calling findOrCreateConversation with customerId: ${customerId}, fromMe: ${fromMe}`);
    const { appConversationId, participantId } = await findOrCreateConversation(
      supabaseClient,
      remoteJid,
      config,
      fromMe,
      customerId
    );
    
    console.log(`[MessageHandler] findOrCreateConversation returned: appConversationId=${appConversationId}, participantId=${participantId}`);

    if (!appConversationId) {
      const errorMsg = '[MessageHandler] Failed to get appConversationId from findOrCreateConversation.';
      console.error(errorMsg);
      return errorMsg;
    }
     if (!participantId) {
      // This is a critical error for message insertion
      const errorMsg = '[MessageHandler] Failed to get participantId from findOrCreateConversation. This likely means user_reference_id is missing for a message FROM ME.';
      console.error(errorMsg);
       if (fromMe) {
         console.warn('[MessageHandler] Double-check user_reference_id in integrations_config for the hardcoded integration ID.');
       }
       return errorMsg; 
    }
    
    console.log(`[MessageHandler] Proceeding to upsert message. Conversation: ${appConversationId}, Participant: ${participantId}`);

    // Extract WhatsApp Message ID (wamid)
    const wamid = data.key.id;

    // --- Upsert message in app ---
    // Validate necessary IDs before upserting
    if (!wamid) {
        console.error("[MessageHandler] Missing WhatsApp message ID (wamid) in webhook data. Cannot upsert.");
        // Decide if this is a critical failure or should be skipped
        // For now, returning an error to highlight the issue.
        return "Missing WhatsApp message ID";
    }
     if (!participantId) {
         console.error("[MessageHandler] Cannot upsert message without a valid sender_participant_id.");
         // This indicates a failure in identifying the sender, likely the 'admin' for fromMe:true
         return "Failed to identify message sender (check user_reference_id config)";
    }
     if (!appConversationId) {
         console.error("[MessageHandler] Cannot upsert message without a valid conversation_id.");
         return "Failed to identify conversation";
    }

    const { error: upsertError } = await supabaseClient
      .from('messages')
      .upsert({
        wamid: wamid, // The unique WhatsApp message ID
        conversation_id: appConversationId,
        content: messageText, // Ensure this is correctly extracted for all types
        sender_participant_id: participantId,
        // Optionally add/update other fields like status based on webhook data
        // is_read: false, // Example: Set initial read status
      }, {
        onConflict: 'wamid', // Specify the unique column for conflict resolution
        // ignoreDuplicates: false // Default is false, ensures updates happen on conflict
      });

    if (upsertError) {
      const errorMsg = `[MessageHandler] Error upserting message in DB (wamid: ${wamid}): ${upsertError.message}`;
      console.error(errorMsg);
      // Depending on the error (e.g., constraint violation vs. connection error),
      // you might still want to proceed with AI logic or return the error.
      // Returning error for now.
      return errorMsg;
    }

    console.log(`[MessageHandler] Successfully upserted message (wamid: ${wamid}) in conversation ${appConversationId} from participant ${participantId}`);

    // --- New AI Agent Session & Interaction Logic ---
    // Only trigger AI logic for non-empty messages coming *from* the contact
    if (!fromMe && messageText && messageText !== 'Media or unknown message type') {
      try {
        // 1. Fetch Agent Integration Settings
        console.log(`[MessageHandler] Fetching agent settings for integration: ${hardcodedIntegrationId}`);
        const { data: agentSettingsData, error: settingsError } = await supabaseClient
          .from('ai_agent_integrations')
          .select(`
            agent_id,
            activation_mode,
            stop_keywords,
            session_timeout_minutes,
            error_message,
            integration_id,
            ai_agents ( keyword_trigger, is_enabled ) // Fetch is_enabled status
          `)
          .eq('integration_id', hardcodedIntegrationId)
          .maybeSingle(); // Assuming one agent per integration for now

        if (settingsError) throw new Error(`Error fetching agent settings: ${settingsError.message}`);
        if (!agentSettingsData) {
          console.log(`[MessageHandler] No AI agent linked to integration ${hardcodedIntegrationId}. Skipping AI logic.`);
          return true; // No agent configured, but message stored successfully
        }

        // Type assertion for cleaner access
        const agentSettings = agentSettingsData as unknown as AgentIntegrationSettings & { ai_agents: { keyword_trigger: string | null, is_enabled: boolean | null } | null };
        const agentId = agentSettings.agent_id;
        const triggerKeyword = agentSettings.ai_agents?.keyword_trigger;
        const agentIsEnabled = agentSettings.ai_agents?.is_enabled ?? false; // Default to false if null/undefined

        console.log(`[MessageHandler] Agent settings found for Agent ID: ${agentId}`, agentSettings);

        // Check if the agent itself is enabled before proceeding
        if (!agentIsEnabled) {
            console.log(`[MessageHandler] Agent ${agentId} is disabled. Skipping AI logic.`);
            return true; // Agent disabled, but message stored successfully
        }

        // 2. Fetch or Initialize Agent Session
        console.log(`[MessageHandler] Fetching session for contact: ${remoteJid}, agent: ${agentId}, integration: ${hardcodedIntegrationId}`);
        const { data: session, error: sessionFetchError } = await supabaseClient // Use const
          .from('ai_agent_sessions')
          .select('id, is_active, last_interaction_timestamp, conversation_history')
          .eq('contact_identifier', remoteJid)
          .eq('agent_id', agentId)
          .eq('integration_id', hardcodedIntegrationId)
          .maybeSingle();

        if (sessionFetchError) throw new Error(`Error fetching agent session: ${sessionFetchError.message}`);

        let sessionId: string | null = session?.id || null;
        let isActive = session?.is_active || false;
        const lastInteraction = session?.last_interaction_timestamp ? new Date(session.last_interaction_timestamp) : null;
        const now = new Date();

        console.log(`[MessageHandler] Current session state: ID=${sessionId}, Active=${isActive}, LastInteraction=${lastInteraction}`);

        // 3. Log Incoming User Message to agent_conversations
        // Do this early, regardless of whether the AI responds
        if (sessionId) { // Only log if a session exists or is about to be created
           console.log(`[MessageHandler] Logging user message to agent_conversations for session ${sessionId}`);
           const { error: logUserMsgError } = await supabaseClient
             .from('agent_conversations')
             .insert({
               session_id: sessionId,
               sender_type: 'user',
               message_content: messageText,
             });
           if (logUserMsgError) console.error(`[MessageHandler] Error logging user message: ${logUserMsgError.message}`); // Log error but continue
        } else {
            console.log(`[MessageHandler] No active session ID yet, skipping user message logging for now.`); // Will be logged after session creation if needed
        }


        // 4. Session State Logic
        let shouldAiRespond = false;
        let sessionNeedsUpdate = false;
        let newSessionData: Partial<AgentSession> & { contact_identifier: string; agent_id: string; integration_id: string } | null = null;

        // Check for timeout first
        if (isActive && lastInteraction && agentSettings.session_timeout_minutes > 0) {
          const timeoutMillis = agentSettings.session_timeout_minutes * 60 * 1000;
          if (now.getTime() - lastInteraction.getTime() > timeoutMillis) {
            console.log(`[MessageHandler] Session ${sessionId} timed out.`);
            isActive = false;
            sessionNeedsUpdate = true;
          }
        }

        // Check for stop keywords if active
        if (isActive && agentSettings.stop_keywords?.some(kw => messageText.toLowerCase() === kw.toLowerCase())) {
          console.log(`[MessageHandler] Stop keyword detected in message. Deactivating session ${sessionId}.`);
          isActive = false;
          sessionNeedsUpdate = true;
          // Optionally send a confirmation message here via Evolution API
        } else if (isActive) {
          // Session is active and not stopped/timed out
          console.log(`[MessageHandler] Session ${sessionId} is active. AI should respond.`);
          shouldAiRespond = true;
          sessionNeedsUpdate = true; // Need to update last_interaction_timestamp
        } else {
          // Session is inactive, check for activation
          if (agentSettings.activation_mode === 'always_on') {
            console.log(`[MessageHandler] Activation mode is 'always_on'. Activating session.`);
            isActive = true;
            shouldAiRespond = true;
            sessionNeedsUpdate = true;
          } else if (agentSettings.activation_mode === 'keyword' && triggerKeyword && messageText.toLowerCase().startsWith(triggerKeyword.toLowerCase())) {
            console.log(`[MessageHandler] Trigger keyword "${triggerKeyword}" matched. Activating session.`);
            isActive = true;
            shouldAiRespond = true;
            sessionNeedsUpdate = true;
          } else {
             console.log(`[MessageHandler] Session inactive and no activation condition met.`);
          }
        }

        // 5. Update or Create Session in DB if needed
        if (sessionNeedsUpdate) {
          const updatePayload = {
            is_active: isActive,
            last_interaction_timestamp: now.toISOString(),
            // TODO: Add conversation_history update logic if needed
          };

          if (sessionId) {
            console.log(`[MessageHandler] Updating session ${sessionId}:`, updatePayload);
            const { error: updateError } = await supabaseClient
              .from('ai_agent_sessions')
              .update(updatePayload)
              .eq('id', sessionId);
            if (updateError) throw new Error(`Error updating session: ${updateError.message}`);
          } else if (isActive) { // Create session only if activating
             newSessionData = {
               ...updatePayload,
               contact_identifier: remoteJid,
               agent_id: agentId,
               integration_id: hardcodedIntegrationId,
             };
             console.log(`[MessageHandler] Creating new session:`, newSessionData);
             const { data: newSession, error: createError } = await supabaseClient
               .from('ai_agent_sessions')
               .insert(newSessionData)
               .select('id')
               .single();
             if (createError) throw new Error(`Error creating session: ${createError.message}`);
             sessionId = newSession.id; // Get the new session ID
             console.log(`[MessageHandler] New session created with ID: ${sessionId}`);

             // Log the initial user message now that we have a session ID
             console.log(`[MessageHandler] Logging initial user message to agent_conversations for new session ${sessionId}`);
             const { error: logUserMsgError } = await supabaseClient
               .from('agent_conversations')
               .insert({
                 session_id: sessionId,
                 sender_type: 'user',
                 message_content: messageText,
               });
             if (logUserMsgError) console.error(`[MessageHandler] Error logging initial user message: ${logUserMsgError.message}`);

          }
        }

        // 6. Invoke AI Agent Handler if required
        if (shouldAiRespond && sessionId) {
          console.log(`[MessageHandler] Invoking ai-agent-handler for session ${sessionId}, agent ${agentId}`);
          // Invoke asynchronously, adding a header to signal internal call
          supabaseClient.functions.invoke('ai-agent-handler', {
            headers: {
              'X-Internal-Call': 'true' // Custom header
            },
            body: {
              agentId: agentId,
              query: messageText, // Pass the full message for now
              sessionId: sessionId, // Pass session ID for context/logging
              contactIdentifier: remoteJid,
              // Pass conversation_history if needed:
              // conversationHistory: session?.conversation_history
            },
          }).then(async ({ data: handlerResponse, error: handlerError }) => {
            let aiResponseContent: string | null = null;
            let knowledgeUsed: unknown = null; // Use unknown instead of any
            const logSenderType = 'ai' as const; // Use const assertion

            if (handlerError) {
              console.error(`[MessageHandler] ai-agent-handler invocation failed for session ${sessionId}:`, handlerError);
              aiResponseContent = agentSettings.error_message; // Use configured error message
            } else if (handlerResponse?.error) {
               console.error(`[MessageHandler] ai-agent-handler returned error for session ${sessionId}:`, handlerResponse.error);
               aiResponseContent = agentSettings.error_message;
            } else {
              console.log(`[MessageHandler] ai-agent-handler invocation succeeded for session ${sessionId}. Response:`, handlerResponse);
              aiResponseContent = handlerResponse?.response || agentSettings.error_message; // Use response or fallback error message
              knowledgeUsed = handlerResponse?.knowledge_used; // Capture knowledge used
            }

            // Log AI response/error to agent_conversations
            console.log(`[MessageHandler] Logging AI response/error to agent_conversations for session ${sessionId}`);
            const { error: logAiMsgError } = await supabaseClient
              .from('agent_conversations')
              .insert({
                session_id: sessionId,
                sender_type: logSenderType,
                message_content: aiResponseContent,
                knowledge_used: knowledgeUsed,
              });
            if (logAiMsgError) console.error(`[MessageHandler] Error logging AI message: ${logAiMsgError.message}`);

            // Send reply via WhatsApp API by invoking evolution-api-handler
            if (aiResponseContent) {
              console.log(`[MessageHandler] Invoking evolution-api-handler to send reply to ${remoteJid}`);
              supabaseClient.functions.invoke('evolution-api-handler', { // Remove action from path
                body: {
                  action: 'send-text', // Add action to body
                  instanceId: hardcodedIntegrationId, // Pass the DB ID of the integration/instance
                  number: remoteJid, // The contact's JID
                  text: aiResponseContent,
                },
              }).then(({ data: sendData, error: sendError }) => {
                 if (sendError) {
                    console.error(`[MessageHandler] Failed to send message via evolution-api-handler for session ${sessionId}:`, sendError);
                 } else {
                    console.log(`[MessageHandler] Successfully invoked evolution-api-handler to send message for session ${sessionId}. Response:`, sendData);
                 }
              }).catch(invokeError => {
                 // Catch errors related to the invocation itself (e.g., network issues)
                 console.error(`[MessageHandler] Error invoking evolution-api-handler function:`, invokeError);
              });
            } else {
               console.log(`[MessageHandler] No AI response content to send for session ${sessionId}.`);
            }

          }).catch(handlerInvokeError => {
             // Catch errors related to the ai-agent-handler invocation itself
             console.error(`[MessageHandler] Error invoking ai-agent-handler function:`, handlerInvokeError);
             // Optionally log this failure to agent_conversations as well
          }); // End async invocation .then() .catch()
        }
        // --- End New AI Agent Session & Interaction Logic ---

      } catch (agentLogicError) {
        console.error(`[MessageHandler] Error during AI agent logic: ${agentLogicError.message}`);
        // Log error but don't fail the webhook response, as the message was stored.
      }
    } // End if (!fromMe && messageText)

    return true; // Indicate success (webhook acknowledged, message stored)

  } catch (error) {
    // This catches errors from findOrCreateCustomer, findOrCreateConversation, or message insertion
    const errorMsg = `[MessageHandler] Critical error before AI logic: ${error.message}`;
    console.error(errorMsg, error);
    return errorMsg;
  }
}
