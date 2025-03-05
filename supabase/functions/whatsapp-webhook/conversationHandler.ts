
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Finds an existing conversation or creates a new one with its participants
 */
export async function findOrCreateConversation(
  supabaseClient: SupabaseClient, 
  remoteJid: string, 
  config: any, 
  fromMe: boolean
): Promise<{ appConversationId: string | null, participantId: string | null }> {
  console.log(`Finding or creating conversation for ${remoteJid}`);
  
  // Check if the participant exists
  const { data: existingParticipant, error: participantError } = await supabaseClient
    .from('conversation_participants')
    .select('id, conversation_id')
    .eq('external_user_identifier', remoteJid)
    .maybeSingle();
  
  if (participantError) {
    console.error('Error finding existing participant:', participantError);
    return { appConversationId: null, participantId: null };
  }
  
  // If conversation exists
  if (existingParticipant) {
    const appConversationId = existingParticipant.conversation_id;
    console.log(`Found existing conversation ${appConversationId} for ${remoteJid}`);

    // Update conversation timestamp
    await supabaseClient
      .from('conversations')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', appConversationId);
    
    // Determine participant ID based on message sender
    let participantId = existingParticipant.id;
    
    if (fromMe) {
      // For fromMe messages, find admin participant
      const { data: adminParticipant, error: adminError } = await supabaseClient
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', appConversationId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!adminError && adminParticipant) {
        participantId = adminParticipant.id;
        console.log(`Using admin participant ID: ${participantId} for fromMe message`);
      }
    } else {
      console.log(`Using member participant ID: ${participantId} for customer message`);
    }
    
    return { appConversationId, participantId };
  }
  
  // Create new conversation and participants
  console.log(`No existing conversation found for ${remoteJid}, creating new one`);
  
  // 1. Create a new app conversation
  const { data: appConversation, error: appConversationError } = await supabaseClient
    .from('conversations')
    .insert({
      integrations_config_id: config.id
    })
    .select()
    .single();
  
  if (appConversationError) {
    console.error('Error creating app conversation:', appConversationError);
    return { appConversationId: null, participantId: null };
  }
  
  const appConversationId = appConversation.conversation_id;
  console.log(`Created new conversation with ID: ${appConversationId}`);
  
  // 2. Create admin participant (the owner of the WhatsApp)
  let adminParticipantId = null;
  if (config.user_reference_id) {
    const { data: adminParticipant, error: adminParticipantError } = await supabaseClient
      .from('conversation_participants')
      .insert({
        conversation_id: appConversationId,
        role: 'admin',
        user_id: config.user_reference_id
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
  
  // 3. Create member participant (the WhatsApp contact)
  const { data: memberParticipant, error: memberParticipantError } = await supabaseClient
    .from('conversation_participants')
    .insert({
      conversation_id: appConversationId,
      role: 'member',
      external_user_identifier: remoteJid
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
  const participantId = fromMe ? (adminParticipantId || null) : memberParticipantId;
  
  return { appConversationId, participantId };
}
