
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Finds an existing conversation or creates a new one with its participants
 */
export async function findOrCreateConversation(
  supabaseClient: SupabaseClient,
  remoteJid: string,
  config: any,
  fromMe: boolean,
  customerId: string | null // Add customerId parameter
): Promise<{ appConversationId: string | null; participantId: string | null }> {
  console.log(`Finding or creating conversation for ${remoteJid}`);

  // 1. Check if a conversation exists with at least one admin and one member
  const { data: existingConversation, error: conversationError } = await supabaseClient
    .from('conversations')
    .select(`
      conversation_id,
      conversation_participants (
        id,
        role
      )
    `)
    .eq('integrations_config_id', config.id)
    .limit(1)
    .maybeSingle();

  if (conversationError) {
    console.error('Error finding existing conversation:', conversationError);
    return { appConversationId: null, participantId: null };
  }

  if (existingConversation && existingConversation.conversation_participants) {
    const adminExists = existingConversation.conversation_participants.some(
      (participant) => participant.role === 'admin'
    );
    const memberExists = existingConversation.conversation_participants.some(
      (participant) => participant.role === 'member'
    );

    if (adminExists && memberExists) {
      const appConversationId = existingConversation.conversation_id;
      console.log(`Found existing conversation ${appConversationId} with admin and member`);

      // Determine participant ID based on message sender
      let participantId: string | null = null;
      if (fromMe) {
        // For fromMe messages, find admin participant
        participantId = existingConversation.conversation_participants.find(
          (participant) => participant.role === 'admin'
        )?.id || null;
        console.log(`Using admin participant ID: ${participantId} for fromMe message`);
      } else {
        // For customer messages, find member participant
        participantId = existingConversation.conversation_participants.find(
          (participant) => participant.role === 'member'
        )?.id || null;
        console.log(`Using member participant ID: ${participantId} for customer message`);
      }

      return { appConversationId, participantId };
    }
  }

  // 2. If no suitable conversation exists, create a new one with both participants
  console.log(`No suitable conversation found for ${remoteJid}, creating new one`);

  // 2.1 Create a new app conversation
  const { data: appConversation, error: appConversationError } = await supabaseClient
    .from('conversations')
    .insert({
      integrations_config_id: config.id,
    })
    .select()
    .single();

  if (appConversationError) {
    console.error('Error creating app conversation:', appConversationError);
    return { appConversationId: null, participantId: null };
  }

  const appConversationId = appConversation.conversation_id;
  console.log(`Created new conversation with ID: ${appConversationId}`);

  // 2.2 Create admin participant (the owner of the WhatsApp)
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
      .select()
      .single();

    if (adminParticipantError) {
      console.error('Error creating admin participant:', adminParticipantError);
    } else {
      adminParticipantId = adminParticipant.id;
      console.log(`Created admin participant with ID: ${adminParticipantId}`);
    }
  }

  // 2.3 Create member participant (the WhatsApp contact)
  const phoneNumber = remoteJid.split('@')[0];
  const { data: memberParticipant, error: memberParticipantError } = await supabaseClient
    .from('conversation_participants')
    .insert({
      conversation_id: appConversationId,
      role: 'member',
      external_user_identifier: phoneNumber, // Use phoneNumber here
      user_id: customerId ? customerId : null, // Reference the customerId, set to null if customerId is null
    })
    .select()
    .single();

  if (memberParticipantError) {
    console.error('Error creating member participant:', memberParticipantError);
    return { appConversationId: null, participantId: null };
  }

  const memberParticipantId = memberParticipant.id;
  console.log(`Created member participant with ID: ${memberParticipantId}`);

  // Return the appropriate participant ID based on message sender
  const participantId = fromMe ? adminParticipantId : memberParticipantId;

  return { appConversationId, participantId };
}
