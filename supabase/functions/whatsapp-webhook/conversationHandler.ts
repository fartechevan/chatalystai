// deno-lint-ignore-file
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

export async function findOrCreateConversation(supabaseClient: SupabaseClient, remoteJid: string, config: any, fromMe: boolean, customerId: string | null): Promise<{ appConversationId: string | null; participantId: string | null }> {
    if (remoteJid.includes('@g.us')) {
        return { appConversationId: null, participantId: null };
    }

    const { user_reference_id: userId } = config;
    const phoneNumber = remoteJid.split('@')[0];

    const { data: existingConversations, error: conversationError } = await supabaseClient
        .from('conversations')
        .select('conversation_id, lead_id, integrations_id')
        .eq('integrations_id', config.id);

    if (conversationError) {
        console.error('Error finding existing conversations:', conversationError);
        return { appConversationId: null, participantId: null };
    }

    let matchingConversation: any = null;
    if (existingConversations && existingConversations.length > 0) {
        for (const conv of existingConversations) {
            const { data: matchingMemberParticipant } = await supabaseClient
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conv.conversation_id)
                .eq('role', 'member')
                .eq('external_user_identifier', phoneNumber)
                .maybeSingle();
            if (matchingMemberParticipant) {
                matchingConversation = conv;
                break;
            }
        }
    }

    if (matchingConversation) {
        const appConversationId = matchingConversation.conversation_id;
        const participantRole = fromMe ? 'admin' : 'member';
        const { data: participant } = await supabaseClient
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', appConversationId)
            .eq('role', participantRole)
            .eq('external_user_identifier', fromMe ? config.user_reference_id : phoneNumber)
            .maybeSingle();
        if (!participant) {
            return { appConversationId, participantId: null };
        }
        return { appConversationId, participantId: participant.id };
    }

    const { data: appConversation, error: appConversationError } = await supabaseClient
        .from('conversations')
        .insert({ integrations_id: config.id })
        .select("conversation_id, lead_id, integrations_id")
        .single();

    if (appConversationError || !appConversation) {
        console.error('Error creating app conversation:', appConversationError);
        return { appConversationId: null, participantId: null };
    }

    const appConversationId = appConversation.conversation_id;
    let adminParticipantId: string | null = null;
    if (config.user_reference_id) {
        const { data: adminParticipant } = await supabaseClient
            .from('conversation_participants')
            .insert({ conversation_id: appConversationId, role: 'admin', external_user_identifier: config.user_reference_id })
            .select("id")
            .single();
        if (adminParticipant) {
            adminParticipantId = adminParticipant.id;
        }
    }

    const { data: memberParticipant, error: memberParticipantError } = await supabaseClient
        .from('conversation_participants')
        .insert({ conversation_id: appConversationId, role: 'member', external_user_identifier: phoneNumber, customer_id: customerId })
        .select("id")
        .single();

    if (memberParticipantError || !memberParticipant) {
        console.error('Error creating member participant:', memberParticipantError);
        return { appConversationId, participantId: null };
    }

    const participantId = fromMe ? adminParticipantId : memberParticipant.id;
    return { appConversationId, participantId };
}
