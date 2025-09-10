import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { findOrCreateCustomer } from "./customerHandler.ts";
import { findOrCreateConversation } from "./conversationHandler.ts";
import { extractMessageContent } from "./utils.ts";

interface AiAgentHandlerResult {
  response?: string;
  image?: string;
}

interface WhatsAppMessageData {
  key: {
    remoteJid: string;
    fromMe?: boolean;
    id: string;
  };
  pushName?: string;
  message?: Record<string, unknown>;
  messageType?: string;
  messageTimestamp?: number;
}

export async function handleMessageEvent(supabaseClient: SupabaseClient, data: WhatsAppMessageData, instanceId: string, integrationConfigId?: string | null): Promise<true | string> {
    if (!data || !data.key || !data.key.remoteJid) {
        return 'Invalid message data structure';
    }

    let remoteJid = data.key.remoteJid;
    if (remoteJid.includes('@g.us')) {
        return true;
    }
    // Ensure the JID is in the correct format for session handling
    if (remoteJid.endsWith('@s.whatsapp.net')) {
        remoteJid = remoteJid.replace('@s.whatsapp.net', '@c.us');
    }

    const fromMe = data.key.fromMe || false;
    const contactName = data.pushName || remoteJid.split('@')[0];
    const messageText = extractMessageContent(data);
    let mediaType: string | null = null;
    let mediaData: Record<string, unknown> | null = null;
    let messageContentForDB: string | null = messageText;

    if (data.messageType && data.message) {
        switch (data.messageType) {
            case 'imageMessage': 
                mediaType = 'image'; 
                mediaData = data.message.imageMessage as Record<string, unknown>; 
                messageContentForDB = (mediaData?.caption as string) || null; 
                break;
            case 'videoMessage': 
                mediaType = 'video'; 
                mediaData = data.message.videoMessage as Record<string, unknown>; 
                messageContentForDB = (mediaData?.caption as string) || null; 
                break;
            case 'audioMessage': 
                mediaType = 'audio'; 
                mediaData = data.message.audioMessage as Record<string, unknown>; 
                messageContentForDB = null; 
                break;
            case 'documentMessage': 
                mediaType = 'document'; 
                mediaData = data.message.documentMessage as Record<string, unknown>; 
                messageContentForDB = (mediaData?.caption as string) || (mediaData?.title as string) || (mediaData?.fileName as string) || null; 
                break;
        }
    }

    let fetchedConfig;
    if (integrationConfigId) {
        const { data } = await supabaseClient.from('integrations_config').select('id, user_reference_id, integration_id, instance_id, instance_display_name').eq('id', integrationConfigId).single();
        fetchedConfig = data;
    } else {
        const { data } = await supabaseClient.from('integrations_config').select('id, user_reference_id, integration_id, instance_id, instance_display_name').eq('instance_id', instanceId).maybeSingle();
        fetchedConfig = data;
    }

    if (!fetchedConfig) {
        return `No integration config found for instance "${instanceId}" or config ID "${integrationConfigId}"`;
    }

    const { data: integrationData, error: integrationError } = await supabaseClient
        .from('integrations')
        .select('base_url, api_key')
        .eq('id', fetchedConfig.integration_id)
        .single();

    if (integrationError || !integrationData) {
        return `Could not fetch integration details for ID ${fetchedConfig.integration_id}`;
    }

    const { base_url: evolutionApiUrl, api_key: evolutionApiKey } = integrationData;

    if (!evolutionApiUrl || !evolutionApiKey) {
        return `Integration ${fetchedConfig.integration_id} is missing base_url or api_key.`;
    }

    const config = { id: fetchedConfig.id, integration_id: fetchedConfig.integration_id, user_reference_id: fetchedConfig.user_reference_id };
    const phoneNumber = remoteJid.split('@')[0];
    const customerId = await findOrCreateCustomer(supabaseClient, phoneNumber, contactName, fromMe);
    if (!customerId) {
        return '[MessageHandler] findOrCreateCustomer returned null or undefined ID.';
    }

    const { appConversationId, participantId } = await findOrCreateConversation(supabaseClient, remoteJid, config, fromMe, customerId);
    if (!appConversationId || !participantId) {
        return `[MessageHandler] Failed to get appConversationId or participantId.`;
    }

    const wamid = data.key.id;
    if (!wamid) {
        return "Missing WhatsApp message ID";
    }

    const { error: upsertError } = await supabaseClient.from('messages').upsert({ wamid: wamid, conversation_id: appConversationId, sender_participant_id: participantId, content: messageContentForDB, media_type: mediaType, media_data: mediaData }, { onConflict: 'wamid' });
    if (upsertError) {
        return `[MessageHandler] Error upserting message: ${upsertError.message}`;
    }

    if (!fromMe && messageText && messageText !== 'Media or unknown message type') {
        // Option 1: Filter for enabled agents in the query
        const { data: agentSettingsData, error: agentSettingsError } = await supabaseClient
            .from('ai_agent_channels')
            .select(`
                agent_id,
                stop_keywords,
                session_timeout_minutes,
                error_message,
                integrations_config_id,
                keyword_trigger,
                activation_mode,
                is_enabled_on_channel,
                ai_agents (
                    id,
                    is_enabled,
                    commands
                )
            `)
            .eq('integrations_config_id', config.id)
            .eq('is_enabled_on_channel', true)  // ✅ Only get enabled channels
            .eq('ai_agents.is_enabled', true)   // ✅ Only get enabled agents
            .limit(1)
            .maybeSingle();

        if (agentSettingsError) {
            console.error(`[MessageHandler] Error fetching agent settings for config ${config.id}:`, agentSettingsError.message);
            return `Error fetching agent settings: ${agentSettingsError.message}`;
        }

        if (agentSettingsData && agentSettingsData.ai_agents && agentSettingsData.ai_agents.is_enabled) {
            const agent = agentSettingsData.ai_agents;
            const agentId = agent.id;
            const stopKeywords = agentSettingsData.stop_keywords || [];
            const sessionTimeoutMinutes = agentSettingsData.session_timeout_minutes || 10;
            const activationMode = agentSettingsData.activation_mode;
            const keywordTrigger = agentSettingsData.keyword_trigger;
            const commands = agent.commands || {};

            // Check for direct command matches first (exact match only)
            const messageTextLower = messageText!.toLowerCase().trim();
            for (const [keyword, response] of Object.entries(commands)) {
                if (messageTextLower === keyword.toLowerCase().trim()) {
                    console.log(`[MessageHandler] Direct command match found: ${keyword} -> ${response}`);
                    
                    // Send direct response immediately
                    const messageApiUrl = `${evolutionApiUrl}/message/sendText/${fetchedConfig.instance_display_name}`;
                    const payload = {
                        number: remoteJid.split('@')[0],
                        text: response
                    };
                    
                    const sendResponse = await fetch(messageApiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': evolutionApiKey
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!sendResponse.ok) {
                        const errorBody = await sendResponse.text();
                        console.error(`[MessageHandler] Error sending direct command response:`, errorBody);
                        return `Failed to send command response: ${errorBody}`;
                    }
                    
                    console.log(`[MessageHandler] Direct command response sent successfully`);
                    return true;
                }
            }

            // Fix stop keyword logic (around line 151)
            if (stopKeywords.some((keyword: string) => messageText!.toLowerCase().includes(keyword.toLowerCase()))) {
                const { data: activeSession, error: endSessionError } = await supabaseClient
                    .from('ai_agent_sessions')
                    .update({ 
                        status: 'closed', 
                        ended_at: new Date().toISOString()
                    })
                    .eq('contact_identifier', remoteJid)
                    .eq('integrations_config_id', config.id)
                    .eq('status', 'active')
                    .select()
                    .single();
                
                if (endSessionError) console.error(`[MessageHandler] Error ending session for contact ${remoteJid}:`, endSessionError.message);
                if (activeSession) console.log(`[MessageHandler] AI session ${activeSession.id} ended by stop keyword.`);
                
                return true;
            }

            const { data: activeSession, error: sessionError } = await supabaseClient
                .from('ai_agent_sessions')
                .select('id, created_at')
                .eq('contact_identifier', remoteJid)
                .eq('integrations_config_id', config.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sessionError) {
                console.error(`[MessageHandler] Error fetching active session for conversation ${appConversationId}:`, sessionError.message);
            }

            let currentSessionId: string | null = activeSession ? activeSession.id : null;
            const now = new Date();
            // Fix session timeout logic (around line 181)
            if (activeSession && (now.getTime() - new Date(activeSession.created_at).getTime()) > sessionTimeoutMinutes * 60 * 1000) {
                await supabaseClient.from('ai_agent_sessions').update({ 
                    status: 'closed', 
                    ended_at: now.toISOString()
                }).eq('id', activeSession.id);
                currentSessionId = null;
            }

            let shouldTrigger = false;
            if (!currentSessionId) {
                if (activationMode === 'always_on') {
                    shouldTrigger = true;
                } else if (activationMode === 'keyword' && keywordTrigger) {
                    console.log(`[MessageHandler] Debug: messageText='${messageText}', keywordTrigger='${keywordTrigger}'`);
                    if (messageText!.toLowerCase().includes(keywordTrigger.toLowerCase())) {
                        shouldTrigger = true;
                    }
                }
            }

            if (currentSessionId || shouldTrigger) {
                if (!currentSessionId) {
                    const { data: newSession, error: newSessionError } = await supabaseClient
                        .from('ai_agent_sessions')
                        .insert({
                            agent_id: agentId,
                            contact_identifier: remoteJid,
                            integrations_config_id: config.id,
                            status: 'active',
                            created_at: now.toISOString()
                        })
                        .select('id')
                        .single();
                    
                    if (newSessionError) {
                        console.error(`[MessageHandler] Error creating new session for agent ${agentId}:`, newSessionError.message);
                        return `Failed to create new session: ${newSessionError.message}`;
                    }
                    currentSessionId = newSession.id;
                }

                if (currentSessionId) {
                    try {
                        const invokeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-agent-handler`;
                        const response = await fetch(invokeUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                                'Content-Type': 'application/json',
                                'X-Internal-Call': 'true'
                            },
                            body: JSON.stringify({
                                agentId: agentId,
                                query: messageText,
                                sessionId: currentSessionId,
                                contactIdentifier: remoteJid
                            })
                        });

                        if (!response.ok) {
                            const errorBody = await response.text();
                            console.error(`[MessageHandler] AI Agent Handler invocation failed with status ${response.status}:`, errorBody);
                        } else {
                            const result = await response.json() as AiAgentHandlerResult;
                            console.log(`[MessageHandler] AI Agent Handler response for session ${currentSessionId}:`, result);

                            if (result && result.response) {
                                console.log(`[MessageHandler] Preparing to send message to ${remoteJid.split('@')[0]}`);
                                const messageApiUrl = `${evolutionApiUrl}/message/sendText/${fetchedConfig.instance_display_name}`;
                                const payload = {
                                    number: remoteJid.split('@')[0],
                                    text: result.response
                                };
                                console.log(`[MessageHandler] Sending payload to Evolution API:`, JSON.stringify(payload));
                                const sendResponse = await fetch(messageApiUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'apikey': evolutionApiKey
                                    },
                                    body: JSON.stringify(payload)
                                });
                                if (!sendResponse.ok) {
                                    const errorBody = await sendResponse.text();
                                    console.error(`[MessageHandler] Error sending message via Evolution API:`, errorBody);
                                    return `Failed to send message: ${errorBody}`;
                                }
                                console.log(`[MessageHandler] Successfully sent message via Evolution API.`);
                            }
                             if (result && result.image) {
                                console.log(`[MessageHandler] Preparing to send image to ${remoteJid.split('@')[0]}`);
                                const imageApiUrl = `${evolutionApiUrl}/message/sendMedia/${fetchedConfig.instance_display_name}`;
                                const imagePayload = {
                                    number: remoteJid.split('@')[0],
                                    media: {
                                        url: result.image,
                                    },
                                    caption: result.response
                                };
                                console.log(`[MessageHandler] Sending image payload to Evolution API:`, JSON.stringify(imagePayload));
                                const sendImageResponse = await fetch(imageApiUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'apikey': evolutionApiKey
                                    },
                                    body: JSON.stringify(imagePayload)
                                });
                                if (!sendImageResponse.ok) {
                                    const errorBody = await sendImageResponse.text();
                                    console.error(`[MessageHandler] Error sending image via Evolution API:`, errorBody);
                                    return `Failed to send image: ${errorBody}`;
                                }
                                console.log(`[MessageHandler] Successfully sent image via Evolution API.`);
                            }
                        }
                    } catch (e: unknown) {
                        if (e instanceof Error) {
                            console.error(`[MessageHandler] Fetch error during AI Agent Handler invocation:`, e.message);
                        } else {
                            console.error(`[MessageHandler] Fetch error during AI Agent Handler invocation:`, e);
                        }
                    }
                }
            }
        }
    }
    return true;
}
