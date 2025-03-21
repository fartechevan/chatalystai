
import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findOrCreateCustomer } from "./customerHandler.ts";

/**
 * Finds an existing conversation or creates a new one with its participants
 */
export async function findOrCreateConversation(
  supabaseClient: SupabaseClient,
  remoteJid: string,
  config: any,
  fromMe: boolean,
  customerId: string | null
): Promise<{ appConversationId: string | null; participantId: string | null }> {
  console.log(`Finding or creating conversation for ${remoteJid} with customerId: ${customerId}`);
  
  // Skip processing for group chats
  if (remoteJid.includes('@g.us')) {
    console.log('Skipping conversation creation for group chat');
    return { appConversationId: null, participantId: null };
  }

  const { user_reference_id: userId } = config;
  const phoneNumber = remoteJid.split('@')[0];

  try {
    // 1. Check if a conversation exists for this specific remoteJid and integration config
    const { data: existingConversations, error: conversationError } = await supabaseClient
      .from('conversations')
      .select(`
        conversation_id,
        lead_id,
        integrations_config_id
      `)
      .eq('integrations_config_id', config.id);

    if (conversationError) {
      console.error('Error finding existing conversations:', conversationError);
      return { appConversationId: null, participantId: null };
    }

    console.log(`Found ${existingConversations?.length || 0} potential conversations for config ID ${config.id}`);

    // Find conversation with a member participant matching this remoteJid/phoneNumber
    let matchingConversation = null;
    if (existingConversations && existingConversations.length > 0) {
      for (const conv of existingConversations) {
        // Query conversation participants to find a matching member
        const { data: conversationParticipants, error: participantsError } = await supabaseClient
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', conv.conversation_id)
          .eq('role', 'member')
          .eq('external_user_identifier', phoneNumber);

        if (participantsError) {
          console.error('Error finding conversation participants:', participantsError);
          continue; // Skip to the next conversation
        }

        if (conversationParticipants && conversationParticipants.length > 0) {
          console.log(`Found existing conversation for phoneNumber ${phoneNumber}: ${conv.conversation_id}`);
          matchingConversation = conv;
          break;
        }
      }
    }

    if (matchingConversation) {
      const appConversationId = matchingConversation.conversation_id;
      console.log(`Using existing conversation ${appConversationId} for ${remoteJid}`);

      // Determine participant ID based on message sender
      let participantRole = fromMe ? 'admin' : 'member';
      
      // Query conversation participants to find the appropriate participant ID
      const { data: participants, error: participantError } = await supabaseClient
        .from('conversation_participants')
        .select('id, role')
        .eq('conversation_id', matchingConversation.conversation_id)
        .eq('role', participantRole);

      if (participantError) {
        console.error('Error finding participant:', participantError);
        return { appConversationId: null, participantId: null };
      }

      if (!participants || participants.length === 0) {
        console.error(`No ${participantRole} participant found for conversation ${matchingConversation.conversation_id}`);
        return { appConversationId: null, participantId: null };
      }

      const participantId = participants[0].id;
      console.log(`Using participant ID: ${participantId} for ${participantRole} message`);

      return { appConversationId, participantId };
    }

    // 2. If no suitable conversation exists, create a new one with both participants
    console.log(`No existing conversation found for ${remoteJid}, creating new one`);

    // 2.1 Create a new app conversation
    const { data: appConversation, error: appConversationError } = await supabaseClient
      .from('conversations')
      .insert({
        integrations_config_id: config.id,
      })
      .select();

    if (appConversationError) {
      console.error('Error creating app conversation:', appConversationError);
      return { appConversationId: null, participantId: null };
    }

    if (!appConversation || appConversation.length === 0) {
      console.error('No conversation created, empty result');
      return { appConversationId: null, participantId: null };
    }

    const appConversationId = appConversation[0].conversation_id;
    console.log(`Created new conversation with ID: ${appConversationId}`);

    // 2.2 Create admin participant (the owner of the WhatsApp)
    let adminParticipantId: string | null = null;
    if (config.user_reference_id) {
      const { data: adminParticipant, error: adminParticipantError } = await supabaseClient
        .from('conversation_participants')
        .insert({
          conversation_id: appConversationId,
          role: 'admin',
          external_user_identifier: config.user_reference_id, // Use external_user_identifier for admin
        })
        .select();

      if (adminParticipantError) {
        console.error('Error creating admin participant:', adminParticipantError);
      } else if (adminParticipant && adminParticipant.length > 0) {
        adminParticipantId = adminParticipant[0].id;
        console.log(`Created admin participant with ID: ${adminParticipantId}`);
      }
    } else {
      console.log('No user_reference_id in config, skipping admin participant creation');
    }

    // 2.3 Create member participant (the WhatsApp contact)
    const { data: memberParticipant, error: memberParticipantError } = await supabaseClient
      .from('conversation_participants')
      .insert({
        conversation_id: appConversationId,
        role: 'member',
        external_user_identifier: phoneNumber,
        customer_id: customerId,
      })
      .select();

    if (memberParticipantError) {
      console.error('Error creating member participant:', memberParticipantError);
      return { appConversationId: null, participantId: null };
    }

    if (!memberParticipant || memberParticipant.length === 0) {
      console.error('No member participant created, empty result');
      return { appConversationId: null, participantId: null };
    }

    const memberParticipantId = memberParticipant[0].id;
    console.log(`Created member participant with ID: ${memberParticipantId}`);

    // Return the appropriate participant ID based on message sender
    const participantId = fromMe ? adminParticipantId : memberParticipantId;

    return { 
      appConversationId, 
      participantId: participantId || null 
    };
  } catch (error) {
    console.error('Unexpected error in findOrCreateConversation:', error);
    return { appConversationId: null, participantId: null };
  }
}
