import { Json } from "../_shared/database.types.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { extractMessageContent } from "./utils.ts";
import { findOrCreateCustomer } from "./customerHandler.ts";
import { findOrCreateConversation } from "./conversationHandler.ts";
// Import PostgrestError from the Supabase client library itself, as it's often re-exported
import { PostgrestError } from "@supabase/supabase-js";

// Define types for cleaner code
interface AgentIntegrationSettings {
  agent_id: string;
  stop_keywords: string[];
  session_timeout_minutes: number;
  error_message: string;
  // integration_id: string; // Removed
}

interface AgentSession {
  id: string;
  status: 'active' | 'closed' | 'error'; 
  last_interaction_timestamp: string;
  conversation_history: unknown; 
}

export interface WhatsAppMessageData { 
  key: {
    remoteJid: string;
    fromMe?: boolean;
    id: string; 
  };
  pushName?: string;
  message?: Record<string, unknown>; // Corrected from 'any' to 'unknown'
  messageType?: string; 
  messageTimestamp?: number; 
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
  let messageText = extractMessageContent(data); 
  
  let mediaType: string | null = null;
  let mediaData: Json | null = null;
  let messageContentForDB: string | null = messageText; 

  console.log(`[MessageHandler] Initial extracted messageText: "${messageText}"`);
  console.log(`[MessageHandler] Webhook data.messageType: "${data.messageType}"`);
  console.log(`[MessageHandler] Webhook data.message object:`, data.message);


  if (data.messageType && data.message) {
    switch (data.messageType) {
      case 'imageMessage':
        if (data.message.imageMessage && typeof data.message.imageMessage === 'object') {
          console.log('[MessageHandler] Detected imageMessage:', data.message.imageMessage);
          mediaType = 'image';
          mediaData = data.message.imageMessage as Json;
          const imageMsg = data.message.imageMessage as { caption?: string };
          messageContentForDB = imageMsg.caption || null;
          if (imageMsg.caption && messageText !== imageMsg.caption) {
            messageText = imageMsg.caption;
          }
        } else {
          console.warn('[MessageHandler] messageType is imageMessage, but data.message.imageMessage is missing or not an object.');
        }
        break;
      case 'videoMessage':
        if (data.message.videoMessage && typeof data.message.videoMessage === 'object') {
          console.log('[MessageHandler] Detected videoMessage:', data.message.videoMessage);
          mediaType = 'video';
          mediaData = data.message.videoMessage as Json;
          const videoMsg = data.message.videoMessage as { caption?: string };
          messageContentForDB = videoMsg.caption || null;
          if (videoMsg.caption && messageText !== videoMsg.caption) {
            messageText = videoMsg.caption;
          }
        } else {
          console.warn('[MessageHandler] messageType is videoMessage, but data.message.videoMessage is missing or not an object.');
        }
        break;
      case 'audioMessage':
        if (data.message.audioMessage && typeof data.message.audioMessage === 'object') {
          console.log('[MessageHandler] Detected audioMessage:', data.message.audioMessage);
          mediaType = 'audio';
          mediaData = data.message.audioMessage as Json;
          messageContentForDB = null; 
        } else {
          console.warn('[MessageHandler] messageType is audioMessage, but data.message.audioMessage is missing or not an object.');
        }
        break;
      case 'documentMessage':
        if (data.message.documentMessage && typeof data.message.documentMessage === 'object') {
          console.log('[MessageHandler] Detected documentMessage:', data.message.documentMessage);
          mediaType = 'document';
          mediaData = data.message.documentMessage as Json;
          const docMsg = data.message.documentMessage as { caption?: string; title?: string; fileName?: string };
          messageContentForDB = docMsg.caption || docMsg.title || docMsg.fileName || null;
          if (messageContentForDB && messageText !== messageContentForDB) {
             messageText = messageContentForDB;
          }
        } else {
          console.warn('[MessageHandler] messageType is documentMessage, but data.message.documentMessage is missing or not an object.');
        }
        break;
      default:
        console.log(`[MessageHandler] Unhandled data.messageType: "${data.messageType}" or no specific media object found.`);
        break;
    }
  } else {
    console.log('[MessageHandler] No data.messageType or data.message found in webhook.');
  }

  if (mediaType && (messageContentForDB === '[Image]' || messageContentForDB === 'Media or unknown message type')) {
     messageContentForDB = null;
  } else if (!mediaType && messageText === 'Media or unknown message type') {
    messageContentForDB = null; 
  }


  // Skip group chats (messages with @g.us)
  if (remoteJid.includes('@g.us')) {
    console.log(`Skipping group chat message from ${remoteJid}`);
    return true; 
  }
  
  console.log(`[MessageHandler] Processing for DB: mediaType="${mediaType}", messageContentForDB="${messageContentForDB}", mediaData:`, mediaData ? JSON.stringify(mediaData).substring(0,100) + "..." : "null");
  console.log(`[MessageHandler] Text for AI: "${messageText}"`);

  // Use the instanceId (Evolution API instance name) passed to this function
  // to find the correct integration configuration.
  console.log(`[MessageHandler] Fetching integration_config using instance_display_name: "${instanceId}"`);
  const { data: fetchedConfig, error: configError } = await supabaseClient
    .from('integrations_config')
    .select('id, user_reference_id, integration_id') // Select integration_id to link to the main integrations table
    .eq('instance_display_name', instanceId) // Match with the Evolution instance name
    .maybeSingle();

  if (configError) {
    const errorMsg = `Error fetching integration config for instance_display_name "${instanceId}": ${configError.message}`;
    console.error(errorMsg);
    return errorMsg;
  }

  if (!fetchedConfig) {
    const errorMsg = `No integration config found for instance_display_name: "${instanceId}"`;
    console.error(errorMsg);
    return errorMsg;
  }

  // Now, fetchedConfig.integration_id is the ID for the 'integrations' table.
  // And fetchedConfig.id is the ID for the 'integrations_config' table row itself.
  const config = {
    id: fetchedConfig.id, // This is the integrations_config.id
    integration_id: fetchedConfig.integration_id, // This is the integrations.id
    user_reference_id: fetchedConfig.user_reference_id,
  };
  
  // The 'hardcodedIntegrationId' is now replaced by 'config.integration_id' for subsequent logic.
  // For example, when fetching agent settings:
  // .eq('integration_id', config.integration_id)
  // When creating agent sessions:
  // integration_id: config.integration_id,
  // When invoking evolution-api-handler for AI response:
  // instanceId: config.integration_id, (if evolution-api-handler expects the main integration_id)
  // OR, if evolution-api-handler needs the integrations_config.id, then pass config.id.
  // Based on evolution-api-handler, it seems to expect the main 'integrations' table ID.
  // So, 'config.integration_id' should be used where 'hardcodedIntegrationId' was used.

  const phoneNumber = remoteJid.split('@')[0];
  let customerId: string | null = null;
  try {
    customerId = await findOrCreateCustomer(supabaseClient, phoneNumber, contactName, fromMe);
    if (!customerId) {
       const errorMsg = '[MessageHandler] findOrCreateCustomer returned null or undefined ID.';
       console.error(errorMsg);
       return errorMsg;
    }
  } catch (error) {
    const errorMsg = `[MessageHandler] Error during findOrCreateCustomer call: ${(error as Error).message}`;
    console.error(errorMsg, error);
    return errorMsg;
  }
  
  try {
    const { appConversationId, participantId } = await findOrCreateConversation(
      supabaseClient,
      remoteJid,
      config,
      fromMe,
      customerId
    );
    
    if (!appConversationId || !participantId) {
      const errorMsg = `[MessageHandler] Failed to get appConversationId (${appConversationId}) or participantId (${participantId}).`;
      console.error(errorMsg);
      return errorMsg;
    }
    
    const wamid = data.key.id;

    if (!wamid) {
        console.error("[MessageHandler] Missing WhatsApp message ID (wamid) in webhook data. Cannot upsert.");
        return "Missing WhatsApp message ID";
    }
    
    const upsertPayload = {
      wamid: wamid,
      conversation_id: appConversationId,
      sender_participant_id: participantId,
      content: messageContentForDB, 
      media_type: mediaType,
      media_data: mediaData,
    };

    console.log('[MessageHandler] Final upsertPayload:', JSON.stringify(upsertPayload, null, 2));

    const { data: upsertedMessage, error: upsertError } = await supabaseClient
      .from('messages')
      .upsert(upsertPayload, {
        onConflict: 'wamid', 
      })
      .select(); 

    if (upsertError) {
      const errorMsg = `[MessageHandler] Error upserting message in DB (wamid: ${wamid}, convId: ${appConversationId}, partId: ${participantId}): ${upsertError.message}. Details: ${JSON.stringify(upsertError)}`;
      console.error(errorMsg, upsertError); 
      return errorMsg;
    }

    console.log(`[MessageHandler] Successfully upserted/updated message (wamid: ${wamid}). Result: ${JSON.stringify(upsertedMessage)}`);
    
    if (!fromMe && messageText && messageText !== 'Media or unknown message type') {
      try {
        const { data: agentSettingsData, error: settingsError } = await supabaseClient
          .from('ai_agent_integrations')
          .select(
            `agent_id,
            activation_mode,
            stop_keywords,
            session_timeout_minutes,
            error_message,
            integrations_config_id,
            ai_agents ( keyword_trigger, is_enabled, activation_mode )`
          )
          // Query by the new foreign key column
          .eq('integrations_config_id', config.id) // config.id is integrations_config.id
          .limit(1) 
          .maybeSingle();

        if (settingsError) {
          console.error(`[MessageHandler] DB error fetching agent settings for integrations_config_id ${config.id}. Code: ${settingsError.code}, Message: ${settingsError.message}, Details: ${JSON.stringify(settingsError.details)}`);
          if (settingsError.code !== 'PGRST116') { // PGRST116 means no rows, which should be handled by !agentSettingsData
            throw new Error(`Error fetching agent settings: ${settingsError.message}`);
          }
          // If code IS PGRST116, we let it fall through to the !agentSettingsData check
        }
        
        if (!agentSettingsData) {
          console.log(`[MessageHandler] No AI agent linked to integrations_config_id ${config.id}. Skipping AI logic.`);
          return true; 
        }

        const agentSettings = agentSettingsData as unknown as AgentIntegrationSettings & { ai_agents: { keyword_trigger: string | null, is_enabled: boolean | null, activation_mode: 'keyword' | 'always_on' | null } | null };
        const agentId = agentSettings.agent_id;
        const triggerKeyword = agentSettings.ai_agents?.keyword_trigger;
        const agentIsEnabled = agentSettings.ai_agents?.is_enabled ?? false; 
        const agentActivationMode = agentSettings.ai_agents?.activation_mode || 'keyword'; 

        if (!agentIsEnabled) {
            console.log(`[MessageHandler] Agent ${agentId} is disabled. Skipping AI logic.`);
            return true; 
        }

        const { data: session, error: sessionFetchError } = await supabaseClient 
          .from('ai_agent_sessions')
          .select('id, status, last_interaction_timestamp, conversation_history')
          .eq('contact_identifier', remoteJid)
          .eq('agent_id', agentId)
          // Session should also be linked via the specific integrations_config_id
          .eq('integrations_config_id', config.id) 
          .maybeSingle();

        if (sessionFetchError) throw new Error(`Error fetching agent session for integrations_config_id ${config.id}: ${sessionFetchError.message}`);

        let sessionId: string | null = session?.id || null;
        const currentStatus: 'active' | 'closed' | 'error' = session?.status || 'closed';
        const lastInteraction = session?.last_interaction_timestamp ? new Date(session.last_interaction_timestamp) : null;
        const now = new Date();
        let nextStatus = currentStatus;
        let shouldAiRespond = false;

        if (currentStatus === 'active' && lastInteraction && agentSettings.session_timeout_minutes > 0) {
          const timeoutMillis = agentSettings.session_timeout_minutes * 60 * 1000;
          if (now.getTime() - lastInteraction.getTime() > timeoutMillis) {
            nextStatus = 'closed'; 
          }
        }

        if (nextStatus === 'active' && agentSettings.stop_keywords?.some(kw => messageText.toLowerCase() === kw.toLowerCase())) {
          nextStatus = 'closed'; 
        } else if (nextStatus === 'active') {
          shouldAiRespond = true;
        } else if (nextStatus === 'closed' || nextStatus === 'error') {
          if (agentActivationMode === 'always_on') {
            nextStatus = 'active'; 
            shouldAiRespond = true;
          } else if (agentActivationMode === 'keyword' && triggerKeyword && messageText.toLowerCase().startsWith(triggerKeyword.toLowerCase())) {
            nextStatus = 'active'; 
            shouldAiRespond = true;
          }
        }

        if (!session && nextStatus === 'active') {
            const createPayload = {
                status: 'active',
                last_interaction_timestamp: now.toISOString(),
                contact_identifier: remoteJid,
                agent_id: agentId,
                integrations_config_id: config.id, // Use new FK for session
            };
            const { data: newSession, error: createError } = await supabaseClient
                .from('ai_agent_sessions')
                .insert(createPayload)
                .select('id')
                .single();
            if (createError) throw new Error(`Error creating new session: ${createError.message}`);
            sessionId = newSession!.id; 
        } else if (session && (nextStatus !== currentStatus || nextStatus === 'active')) {
            const updatePayload: { last_interaction_timestamp: string; status?: 'active' | 'closed' | 'error'; conversation_history?: unknown } = {
                last_interaction_timestamp: now.toISOString(),
            };
            if (nextStatus !== currentStatus) {
                updatePayload.status = nextStatus;
            }
            const { error: updateError } = await supabaseClient
                .from('ai_agent_sessions')
                .update(updatePayload)
                .eq('id', session.id); 
            if (updateError) throw new Error(`Error updating session ${session.id}: ${updateError.message}`);
            sessionId = session.id; 
        }
        
        if (sessionId && nextStatus === 'active') {
           const { error: logUserMsgError } = await supabaseClient
             .from('agent_conversations')
             .insert({
               session_id: sessionId, 
               sender_type: 'user',
               message_content: messageText,
             });
           if (logUserMsgError) console.error(`[MessageHandler] Error logging user message for session ${sessionId}: ${logUserMsgError.message}`);
        }

        if (shouldAiRespond && sessionId) {
          supabaseClient.functions.invoke('ai-agent-handler', {
            headers: { 'X-Internal-Call': 'true' },
            body: {
              agentId: agentId,
              query: messageText, 
              sessionId: sessionId, 
              contactIdentifier: remoteJid,
            },
          }).then(async ({ data: handlerResponse, error: handlerError }) => {
            let aiResponseContent: string | null = null;
            let knowledgeUsed: unknown = null; 
            const logSenderType = 'ai' as const;

            console.log(`[MessageHandler] ai-agent-handler response received. handlerResponse:`, JSON.stringify(handlerResponse, null, 2), `handlerError:`, handlerError);

            if (handlerError || handlerResponse?.error) {
              console.error(`[MessageHandler] ai-agent-handler failed/errored for session ${sessionId}:`, handlerError || handlerResponse?.error);
              aiResponseContent = agentSettings.error_message; 
            } else {
              // Ensure handlerResponse and handlerResponse.response are what we expect
              console.log(`[MessageHandler] ai-agent-handler successful response data:`, JSON.stringify(handlerResponse, null, 2));
              aiResponseContent = handlerResponse?.response || agentSettings.error_message; 
              knowledgeUsed = handlerResponse?.knowledge_used; 
              console.log(`[MessageHandler] Extracted aiResponseContent: "${aiResponseContent}"`);
            }

            await supabaseClient
              .from('agent_conversations')
              .insert({
                session_id: sessionId,
                sender_type: logSenderType,
                message_content: aiResponseContent,
                knowledge_used: knowledgeUsed,
              });
            
            console.log(`[MessageHandler] Before invoking evolution-api-handler. aiResponseContent: "${aiResponseContent}" (Type: ${typeof aiResponseContent})`);
            if (aiResponseContent && typeof aiResponseContent === 'string' && aiResponseContent.trim() !== "") {
              console.log(`[MessageHandler] Invoking evolution-api-handler with text: "${aiResponseContent}"`);
              supabaseClient.functions.invoke('evolution-api-handler', { 
                body: {
                  action: 'sendText',  // Corrected action name
                  // evolution-api-handler expects integrationConfigId which is integrations_config.id
                  integrationConfigId: config.id, 
                  number: remoteJid, 
                  text: aiResponseContent,
                },
              }).then(({ data: evoData, error: evoError }) => {
                if (evoError) {
                  console.error(`[MessageHandler] evolution-api-handler invocation resulted in an error:`, evoError);
                } else {
                  console.log(`[MessageHandler] evolution-api-handler invocation successful. Response:`, JSON.stringify(evoData, null, 2));
                }
              }).catch(invokeError => {
                 console.error(`[MessageHandler] Error invoking evolution-api-handler function (outer catch):`, invokeError);
              });
            } else {
              console.log(`[MessageHandler] Skipped invoking evolution-api-handler because aiResponseContent was empty or not a string. Content: "${aiResponseContent}"`);
            }
          }).catch(handlerInvokeError => {
             console.error(`[MessageHandler] Error invoking ai-agent-handler function:`, handlerInvokeError);
          }); 
        }
      } catch (agentLogicError) {
        console.error(`[MessageHandler] Error during AI agent logic: ${(agentLogicError as Error).message}`);
      }
    } 
    return true; 
  } catch (error) {
    const errorMsg = `[MessageHandler] Critical error: ${(error as Error).message}`;
    console.error(errorMsg, error);
    return errorMsg;
  }
}
