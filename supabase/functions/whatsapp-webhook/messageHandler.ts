
import { SupabaseClient } from "@supabase/supabase-js";
import { extractMessageContent } from "./utils.ts";
import { findOrCreateCustomer } from "./customerHandler.ts";
import { findOrCreateConversation } from "./conversationHandler.ts";
// Import PostgrestError from the Supabase client library itself, as it's often re-exported
import { PostgrestError } from "@supabase/supabase-js";

// Define types for cleaner code
interface AgentIntegrationSettings {
  agent_id: string;
  // activation_mode: 'keyword' | 'always_on'; // This will come from the nested ai_agents object
  // keyword_trigger: string | null; // This will come from the nested ai_agents object
  stop_keywords: string[];
  session_timeout_minutes: number;
  error_message: string;
  integration_id: string; // Added integration_id
}

interface AgentSession {
  id: string;
  // is_active: boolean; // Replaced by status
  status: 'active' | 'closed' | 'error'; // Use the new status enum
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
            ai_agents ( keyword_trigger, is_enabled, activation_mode ) // Fetch activation_mode from ai_agents
          `)
          .eq('integration_id', hardcodedIntegrationId)
          .maybeSingle(); // Assuming one agent per integration for now

        if (settingsError) throw new Error(`Error fetching agent settings: ${settingsError.message}`);
        if (!agentSettingsData) {
          console.log(`[MessageHandler] No AI agent linked to integration ${hardcodedIntegrationId}. Skipping AI logic.`);
          return true; // No agent configured, but message stored successfully
        }

        // Type assertion for cleaner access
        const agentSettings = agentSettingsData as unknown as AgentIntegrationSettings & { ai_agents: { keyword_trigger: string | null, is_enabled: boolean | null, activation_mode: 'keyword' | 'always_on' | null } | null };
        const agentId = agentSettings.agent_id;
        const triggerKeyword = agentSettings.ai_agents?.keyword_trigger;
        const agentIsEnabled = agentSettings.ai_agents?.is_enabled ?? false; // Default to false if null/undefined
        const agentActivationMode = agentSettings.ai_agents?.activation_mode || 'keyword'; // Get from ai_agents, default to 'keyword'

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
          // Select the new 'status' column instead of 'is_active'
          .select('id, status, last_interaction_timestamp, conversation_history')
          .eq('contact_identifier', remoteJid)
          .eq('agent_id', agentId)
          .eq('integration_id', hardcodedIntegrationId)
          .maybeSingle();

        if (sessionFetchError) throw new Error(`Error fetching agent session: ${sessionFetchError.message}`);

        let sessionId: string | null = session?.id || null;
        // Get current status from the fetched session, default to 'closed' if no session
        const currentStatus: 'active' | 'closed' | 'error' = session?.status || 'closed';
        const lastInteraction = session?.last_interaction_timestamp ? new Date(session.last_interaction_timestamp) : null;
        const now = new Date();

        // Use a variable to track the intended status after processing this message
        let nextStatus = currentStatus;

        console.log(`[MessageHandler] Current session state: ID=${sessionId}, Status=${currentStatus}, LastInteraction=${lastInteraction}`);

        // 4. Session State Logic
        let shouldAiRespond = false;
        // let sessionNeedsUpdate = false; // Flag to indicate if DB needs update - will be handled by direct logic

        // Check for timeout first if currently active
        if (currentStatus === 'active' && lastInteraction && agentSettings.session_timeout_minutes > 0) {
          const timeoutMillis = agentSettings.session_timeout_minutes * 60 * 1000;
          if (now.getTime() - lastInteraction.getTime() > timeoutMillis) {
            console.log(`[MessageHandler] Session ${sessionId} timed out.`);
            nextStatus = 'closed'; // Set intended status to closed
          }
        }

        // Check for stop keywords if currently active
        if (nextStatus === 'active' && agentSettings.stop_keywords?.some(kw => messageText.toLowerCase() === kw.toLowerCase())) {
          console.log(`[MessageHandler] Stop keyword detected in message. Closing session ${sessionId}.`);
          nextStatus = 'closed'; // Set intended status to closed
          // Optionally send a confirmation message here via Evolution API
        } else if (nextStatus === 'active') {
          // Session is active and not stopped/timed out
          console.log(`[MessageHandler] Session ${sessionId} is active. AI should respond.`);
          shouldAiRespond = true;
          // No status change, but timestamp needs update
        } else if (nextStatus === 'closed' || nextStatus === 'error') {
          // Session is inactive, check for activation
          if (agentActivationMode === 'always_on') {
            console.log(`[MessageHandler] Activation mode is 'always_on' (from ai_agents). Activating session.`);
            nextStatus = 'active'; // Set intended status to active
            shouldAiRespond = true;
          } else if (agentActivationMode === 'keyword' && triggerKeyword && messageText.toLowerCase().startsWith(triggerKeyword.toLowerCase())) {
            console.log(`[MessageHandler] Trigger keyword "${triggerKeyword}" matched (activation_mode: ${agentActivationMode} from ai_agents). Activating session.`);
            nextStatus = 'active'; // Set intended status to active
            shouldAiRespond = true;
          } else {
             console.log(`[MessageHandler] Session inactive and no activation condition met.`);
          }
        }

        // Determine if DB update is needed
        // Update if status changed OR if it's active (to update timestamp)
        // sessionNeedsUpdate = (nextStatus !== currentStatus) || (nextStatus === 'active'); // Replaced by direct logic below

        // 5. Update or Create Session in DB if needed

        if (!session && nextStatus === 'active') {
            // Case 1: No session exists, and we need to create an active one.
            console.log(`[MessageHandler] No existing session found. Creating new active session.`);
            const createPayload = {
                status: 'active',
                last_interaction_timestamp: now.toISOString(),
                contact_identifier: remoteJid,
                agent_id: agentId,
                integration_id: hardcodedIntegrationId,
                // conversation_history: {} // Initialize history for new session
            };
            const { data: newSession, error: createError } = await supabaseClient
                .from('ai_agent_sessions')
                .insert(createPayload)
                .select('id')
                .single();
            if (createError) throw new Error(`Error creating new session: ${createError.message}`);
            sessionId = newSession.id; // Update sessionId to the new one
            console.log(`[MessageHandler] New session created with ID: ${sessionId}`);

        } else if (session && (nextStatus !== currentStatus || nextStatus === 'active')) {
            // Case 2: Session exists. Update its status and/or timestamp.
            // This covers:
            // - Activating a 'closed'/'error' session.
            // - Continuing an 'active' session (timestamp update).
            // - Deactivating an 'active' session to 'closed'/'error'.
            console.log(`[MessageHandler] Existing session ${session.id} found. Current status: ${currentStatus}, Next status: ${nextStatus}. Updating session.`);
            const updatePayload: { last_interaction_timestamp: string; status?: 'active' | 'closed' | 'error'; conversation_history?: unknown } = {
                last_interaction_timestamp: now.toISOString(),
            };
            if (nextStatus !== currentStatus) {
                updatePayload.status = nextStatus;
            }
            // If reactivating a closed/error session, consider resetting conversation_history
            if ((currentStatus === 'closed' || currentStatus === 'error') && nextStatus === 'active') {
                // updatePayload.conversation_history = {}; // Uncomment to clear history on reactivation
                console.log(`[MessageHandler] Session ${session.id} reactivated. Consider if conversation history should be reset.`);
            }

            const { error: updateError } = await supabaseClient
                .from('ai_agent_sessions')
                .update(updatePayload)
                .eq('id', session.id); // Use session.id from the fetched session
            if (updateError) throw new Error(`Error updating session ${session.id}: ${updateError.message}`);
            sessionId = session.id; // Ensure sessionId is correctly set to the existing session's ID
            console.log(`[MessageHandler] Session ${sessionId} updated. New status (if changed): ${nextStatus}.`);
        }
        // If session exists but nextStatus is the same as currentStatus and not 'active' (e.g. remains 'closed'), no DB update needed.

        // Log Incoming User Message to agent_conversations, now that session ID is definitively established
        // Only log if the session is now active (either newly created or continued)
        if (sessionId && nextStatus === 'active') {
           console.log(`[MessageHandler] Logging user message to agent_conversations for active session ${sessionId}`);
           const { error: logUserMsgError } = await supabaseClient
             .from('agent_conversations')
             .insert({
               session_id: sessionId, // This will be the new ID if a new session was created
               sender_type: 'user',
               message_content: messageText,
             });
           if (logUserMsgError) console.error(`[MessageHandler] Error logging user message for session ${sessionId}: ${logUserMsgError.message}`);
        }

        // 6. Invoke AI Agent Handler if required (sessionId here is the correct one for the active/newly active session)
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
