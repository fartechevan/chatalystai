
import { SupabaseClient } from "@supabase/supabase-js"; // Use mapped import
import { extractMessageContent } from "./utils.ts"
import { findOrCreateCustomer } from "./customerHandler.ts"
import { findOrCreateConversation } from "./conversationHandler.ts"

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
    
    console.log(`[MessageHandler] Proceeding to create message. Conversation: ${appConversationId}, Participant: ${participantId}`);
    
    // Create message in app
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: appConversationId,
        content: messageText,
        sender_participant_id: participantId, // This will fail if participantId is null
      });

    if (messageError) {
      const errorMsg = `[MessageHandler] Error creating message in DB: ${messageError.message}`;
      console.error(errorMsg);
      return errorMsg;
    }

    console.log(`[MessageHandler] Successfully created message in conversation ${appConversationId} from participant ${participantId}`);

    // --- Agent Trigger Logic ---
    if (!fromMe && messageText) { // Only trigger for incoming messages with content
      console.log(`[MessageHandler] Checking for agent triggers for integration ID: ${hardcodedIntegrationId}`);
      try {
        const { data: agentLinks, error: agentLinkError } = await supabaseClient
          .from('ai_agent_integrations')
          .select(`
            agent_id,
            ai_agents ( id, keyword_trigger )
          `)
          .eq('integration_id', hardcodedIntegrationId)
          .not('ai_agents.keyword_trigger', 'is', null) // Only agents with triggers
          .neq('ai_agents.keyword_trigger', ''); // Ensure trigger is not empty

        if (agentLinkError) {
          console.error(`[MessageHandler] Error fetching agent links: ${agentLinkError.message}`);
          // Don't return error, just log it. Webhook acknowledged, agent trigger is secondary.
        } else if (agentLinks && agentLinks.length > 0) {
          console.log(`[MessageHandler] Found ${agentLinks.length} potential agent link(s) for this integration.`);
          for (const link of agentLinks) {
            // Force type assertion via unknown to bypass potential TS inference issue
            const agent = link.ai_agents as unknown as ({ id: string; keyword_trigger: string | null } | null);

            // Check if agent exists and has a trigger before proceeding
            if (agent && agent.keyword_trigger) {
               const trigger = agent.keyword_trigger;
               // Case-insensitive check if message starts with the trigger
               if (messageText.toLowerCase().startsWith(trigger.toLowerCase())) {
                 console.log(`[MessageHandler] Matched trigger "${trigger}" for agent ${agent.id}`);
                 const query = messageText.substring(trigger.length).trim(); // Extract query after trigger

                 if (query) {
                   console.log(`[MessageHandler] Invoking query-agent for agent ${agent.id} with query: "${query}"`);
                   // Invoke asynchronously - don't await, don't block webhook response
                   supabaseClient.functions.invoke('query-agent', {
                     body: { agentId: agent.id, query: query },
                   }).then(({ data, error }) => {
                     if (error) {
                       console.error(`[MessageHandler] Async query-agent invocation failed for agent ${agent.id}:`, error);
                     } else {
                       console.log(`[MessageHandler] Async query-agent invocation succeeded for agent ${agent.id}. Response:`, data?.response);
                       // TODO: Add logic here to send the agent's response back via WhatsApp API
                     }
                   });
                 } else {
                    console.log(`[MessageHandler] Trigger matched for agent ${agent.id}, but query is empty. Skipping invocation.`);
                 }
                 // Trigger only the first matched agent
                 break;
               }
            }
          }
        } else {
           console.log(`[MessageHandler] No agents with keyword triggers found linked to integration ${hardcodedIntegrationId}`);
        }
      } catch (agentCheckError) {
         console.error(`[MessageHandler] Error during agent trigger check: ${agentCheckError.message}`);
         // Log error but don't fail the webhook response
      }
    }
    // --- End Agent Trigger Logic ---


    return true; // Indicate success (webhook acknowledged, message stored)
  } catch (error) {
    const errorMsg = `[MessageHandler] Error during conversation handling or message creation: ${error.message}`;
    console.error(errorMsg, error);
    return errorMsg;
  }
}
