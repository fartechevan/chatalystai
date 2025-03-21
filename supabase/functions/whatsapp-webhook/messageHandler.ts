
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractMessageContent } from "./utils.ts"
import { findOrCreateCustomer } from "./customerHandler.ts"
import { findOrCreateConversation } from "./conversationHandler.ts"

/**
 * Handles a WhatsApp message event
 */
export async function handleMessageEvent(supabaseClient: SupabaseClient, data: any, instanceId: string): Promise<boolean> {
  console.log('Processing message event with data:', JSON.stringify(data, null, 2));
  
  if (!data || !data.key || !data.key.remoteJid) {
    console.error('Invalid message data structure');
    return false;
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
  
  // Get the integration config for this instance
  const { data: config, error: configError } = await supabaseClient
    .from('integrations_config')
    .select('id, user_reference_id')
    .eq('instance_id', instanceId)
    .maybeSingle();

  if (configError) {
    console.error('Error fetching integration config:', configError);
    return false;
  }

  if (!config) {
    console.error('No integration config found for instance:', instanceId);
    return false;
  }

  console.log('Found integration config:', config);

  // Extract phone number from remoteJid
  const phoneNumber = remoteJid.split('@')[0];
  console.log(`Extracted phone number: ${phoneNumber}`);

  // Customer handling
  // Call findOrCreateCustomer regardless of fromMe value
  let customerId: string | null = null;
  try {
    customerId = await findOrCreateCustomer(supabaseClient, phoneNumber, contactName);
    console.log(`[MessageHandler] Customer ID: ${customerId}`);
    if (!customerId) return false;
  } catch (error) {
    console.error('Error in findOrCreateCustomer:', error);
    return false;
  }
  
  // Conversation handling
  try {
    const { appConversationId, participantId } = await findOrCreateConversation(
      supabaseClient,
      remoteJid,
      config,
      fromMe,
      customerId
    );
    
    if (!appConversationId || !participantId) {
      console.error('Failed to find or create conversation/participant');
      return false;
    }
    
    console.log(`Conversation created/found: ${appConversationId}, participant: ${participantId}`);
    
    // Create message in app
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: appConversationId,
        content: messageText,
        sender_participant_id: participantId,
      });

    if (messageError) {
      console.error('Error creating message:', messageError);
      return false;
    }

    console.log(`Created new message in conversation ${appConversationId} from participant ${participantId}`);
    return true;
  } catch (error) {
    console.error('Error in conversation or message creation:', error);
    return false;
  }
}
