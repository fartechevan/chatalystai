
import { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCustomer } from "./customerHandler.ts";

// Define minimal types for Supabase query results within this function
type ConversationQueryResult = {
  conversation_id: string;
  lead_id: string | null;
  integrations_id: string | null;
};

type ParticipantQueryResult = {
  id: string;
  role: 'admin' | 'member';
  conversation_id: string;
  external_user_identifier: string | null;
  customer_id: string | null;
};

// Define a type for the config object based on usage
interface WebhookConfig {
  id: string; // Still seems to be used for logging
  integration_id: string;
  user_reference_id?: string;
}

/**
 * Finds an existing conversation or creates a new one with its participants
 */
export async function findOrCreateConversation(
  supabaseClient: SupabaseClient,
  remoteJid: string,
  config: WebhookConfig,
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
        integrations_id
      `)
      // No explicit type assertion here, let TS infer from select string
      .eq('integrations_id', config.integration_id); // Assuming config now holds integration_id

    if (conversationError) {
      console.error('Error finding existing conversations:', conversationError);
      return { appConversationId: null, participantId: null };
    }

    console.log(`Found ${existingConversations?.length || 0} potential conversations for config ID ${config.id}`);

    // Find conversation with a member participant matching this remoteJid/phoneNumber
    let matchingConversation: ConversationQueryResult | null = null; // Explicitly type here
    if (existingConversations && existingConversations.length > 0) {
      for (const conv of existingConversations) {
        // Query conversation participants to find a matching member
        // Use maybeSingle() as we only need to know if at least one exists
        const { data: matchingMemberParticipant, error: participantsError } = await supabaseClient
          .from('conversation_participants')
          .select('id') // Only need to know if one exists
          .eq('conversation_id', conv.conversation_id)
          .eq('role', 'member')
          .eq('external_user_identifier', phoneNumber)
          .maybeSingle(); // Check if at least one exists

        if (participantsError) {
          console.error('Error finding conversation participants:', participantsError);
          continue; // Skip to the next conversation on error
        }

        // If a matching participant was found for this conversation
        if (matchingMemberParticipant) {
          console.log(`Found existing conversation for phoneNumber ${phoneNumber}: ${conv.conversation_id}`);
          matchingConversation = conv; // Assign the conversation object
          break; // Exit the loop once a match is found
        }
      }
    }

    if (matchingConversation) {
      const appConversationId = matchingConversation.conversation_id;
      console.log(`Using existing conversation ${appConversationId} for ${remoteJid}`);

      // Determine participant ID based on message sender
      const participantRole = fromMe ? 'admin' : 'member';
      
      // Query the specific participant (admin or member) using maybeSingle
      const { data: participant, error: participantError } = await supabaseClient
        .from('conversation_participants')
        .select('id') // Select only the ID
        .eq('conversation_id', appConversationId) // Use appConversationId directly
        .eq('role', participantRole)
        // If role is 'member', also match on external_user_identifier (phoneNumber)
        // If role is 'member', also match on external_user_identifier (phoneNumber)
        // If role is 'admin', match on external_user_identifier (user_reference_id) - though this might be less reliable if not set
        .eq('external_user_identifier', fromMe ? config.user_reference_id : phoneNumber) // Use config value
        .maybeSingle(); // Expecting one or none

      if (participantError) {
        console.error(`Error finding ${participantRole} participant:`, participantError);
        return { appConversationId, participantId: null }; // Return conversation ID even if participant lookup fails? Or null? Returning null for participant.
      }

      if (!participant) {
        // This is the critical point for 'fromMe' messages if the admin participant wasn't found/created correctly
        console.error(`No ${participantRole} participant found for conversation ${appConversationId} with identifier ${fromMe ? config.user_reference_id || 'HARDCODED_ID' : phoneNumber}`);
        // Attempt to find *any* participant of the role if the identifier match failed? (Might be risky)
        // For now, return null.
        return { appConversationId, participantId: null };
      }

      const participantId = participant.id;
      console.log(`Using participant ID: ${participantId} for ${participantRole} message`);

      return { appConversationId, participantId };
    }

    // 2. If no suitable conversation exists, create a new one with both participants
    console.log(`No existing conversation found for ${remoteJid}, creating new one`);

    // 2.1 Create a new app conversation
    const { data: appConversation, error: appConversationError } = await supabaseClient
      .from('conversations')
      .insert({
        integrations_id: config.integration_id,
      })
      .select("conversation_id, lead_id, integrations_id") // Select desired fields
      .single(); // Expect a single row back

    if (appConversationError) {
      console.error('Error creating app conversation:', appConversationError);
      return { appConversationId: null, participantId: null };
    }

    // appConversation is now an object or null, not an array
    if (!appConversation) {
      console.error('No conversation created or returned after insert.');
      return { appConversationId: null, participantId: null };
    }

    const appConversationId = appConversation.conversation_id;
    console.log(`Created new conversation with ID: ${appConversationId}`);

    // 2.2 Create admin participant (the owner of the WhatsApp) using the hardcoded ID
    let adminParticipantId: string | null = null;
    // Use the user_reference_id from config if available
    if (config.user_reference_id) {
      const adminIdentifier = config.user_reference_id;
      console.log(`Attempting to create admin participant with identifier from config: ${adminIdentifier}`);
      const { data: adminParticipant, error: adminParticipantError } = await supabaseClient
        .from('conversation_participants')
        .insert({
          conversation_id: appConversationId,
          role: 'admin',
          external_user_identifier: adminIdentifier, // Use identifier from config
        })
        .select("id") // Select only the ID
        .single(); // Expect a single row back

      if (adminParticipantError) {
        // Handle potential unique constraint violation if admin already exists for this conversation?
        // Or assume it's a real error for now.
        console.error('Error creating admin participant:', adminParticipantError);
        // Decide if we should continue without admin participant? For now, log and proceed.
      } else if (adminParticipant) {
        adminParticipantId = adminParticipant.id;
        console.log(`Created admin participant with ID: ${adminParticipantId}`);
      } else {
         console.error('Admin participant insert did not return data.');
      }
    } else {
      // Log if user_reference_id is missing, as admin participant cannot be created
      console.warn(`No user_reference_id found in config for integration ${config.integration_id}. Cannot create admin participant.`);
    }

    // 2.3 Create member participant (the WhatsApp contact)
    const { data: memberParticipant, error: memberParticipantError } = await supabaseClient
      .from('conversation_participants')
      .insert({
        conversation_id: appConversationId,
        role: 'member',
        external_user_identifier: phoneNumber,
        customer_id: customerId, // Link to customer record if available
      })
      .select("id") // Select only the ID
      .single(); // Expect a single row back

    if (memberParticipantError) {
      console.error('Error creating member participant:', memberParticipantError);
      // If member creation fails, the conversation is likely unusable
      return { appConversationId, participantId: null }; // Return conv ID but null participant
    }

    if (!memberParticipant) {
      console.error('Member participant insert did not return data.');
      return { appConversationId, participantId: null };
    }

    const memberParticipantId = memberParticipant.id;
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
