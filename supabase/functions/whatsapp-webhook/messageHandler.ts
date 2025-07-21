// deno-lint-ignore-file
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { findOrCreateCustomer } from "./customerHandler.ts";
import { findOrCreateConversation } from "./conversationHandler.ts";
import { extractMessageContent } from "./utils.ts";

interface WhatsAppMessageData {
  key: {
    remoteJid: string;
    fromMe?: boolean;
    id: string;
  };
  pushName?: string;
  message?: any;
  messageType?: string;
  messageTimestamp?: number;
}

export async function handleMessageEvent(supabaseClient: SupabaseClient, data: WhatsAppMessageData, instanceId: string, integrationConfigId?: string | null): Promise<true | string> {
    if (!data || !data.key || !data.key.remoteJid) {
        return 'Invalid message data structure';
    }

    const remoteJid = data.key.remoteJid;
    if (remoteJid.includes('@g.us')) {
        return true;
    }

    const fromMe = data.key.fromMe || false;
    const contactName = data.pushName || remoteJid.split('@')[0];
    let messageText = extractMessageContent(data);
    let mediaType: string | null = null;
    let mediaData: any = null;
    let messageContentForDB: string | null = messageText;

    if (data.messageType) {
        switch (data.messageType) {
            case 'imageMessage': mediaType = 'image'; mediaData = data.message.imageMessage; messageContentForDB = (data.message.imageMessage as any).caption || null; break;
            case 'videoMessage': mediaType = 'video'; mediaData = data.message.videoMessage; messageContentForDB = (data.message.videoMessage as any).caption || null; break;
            case 'audioMessage': mediaType = 'audio'; mediaData = data.message.audioMessage; messageContentForDB = null; break;
            case 'documentMessage': mediaType = 'document'; mediaData = data.message.documentMessage; messageContentForDB = (data.message.documentMessage as any).caption || (data.message.documentMessage as any).title || (data.message.documentMessage as any).fileName || null; break;
        }
    }

    let fetchedConfig;
    if (integrationConfigId) {
        const { data } = await supabaseClient.from('integrations_config').select('id, user_reference_id, integration_id').eq('id', integrationConfigId).single();
        fetchedConfig = data;
    } else {
        const { data } = await supabaseClient.from('integrations_config').select('id, user_reference_id, integration_id').eq('instance_display_name', instanceId).maybeSingle();
        fetchedConfig = data;
    }

    if (!fetchedConfig) {
        return `No integration config found for instance "${instanceId}" or config ID "${integrationConfigId}"`;
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
        const { data: agentSettingsData } = await supabaseClient.from('ai_agent_integrations').select('agent_id, stop_keywords, session_timeout_minutes, error_message, integrations_config_id, ai_agents ( keyword_trigger, is_enabled, activation_mode )').eq('integrations_config_id', config.id).limit(1).maybeSingle();
        if (agentSettingsData) {
            // AI logic would go here, but is omitted for simplicity in this combined file.
        }
    }
    return true;
}
