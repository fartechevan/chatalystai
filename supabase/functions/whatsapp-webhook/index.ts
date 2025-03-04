import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

function extractMessageContent(data) {
  return data.message?.conversation || 
         data.message?.extendedTextMessage?.text || 
         'Media message';
}

function createErrorResponse(error, status = 500) {
  console.error('Error processing webhook:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  );
}

async function handleMessageEvent(supabaseClient, data, instanceId) {
  console.log('Processing message event with data:', JSON.stringify(data, null, 2));
  
  if (!data || !data.key || !data.key.remoteJid) {
    console.error('Invalid message data structure');
    return false;
  }

  const remoteJid = data.key.remoteJid;
  const fromMe = data.key.fromMe || false;
  const contactName = data.pushName || remoteJid.split('@')[0];
  const messageText = extractMessageContent(data);
  
  console.log(`Processing message from ${fromMe ? 'owner' : 'customer'} ${contactName} (${remoteJid}): ${messageText}`);
  
  // Check if integration config exists for this instance
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

  // Extract phone number from remoteJid
  const phoneNumber = remoteJid.split('@')[0];
  console.log(`Extracted phone number: ${phoneNumber}`);
  
  // Customer handling
  const customerId = await findOrCreateCustomer(supabaseClient, phoneNumber, contactName);
  if (!customerId) return false;
  
  // Conversation handling
  const { appConversationId, participantId } = await findOrCreateConversation(
    supabaseClient, 
    remoteJid, 
    config,
    fromMe
  );
  
  if (!appConversationId || !participantId) {
    console.error('Failed to find or create conversation/participant');
    return false;
  }
  
  // Create message in app
  const { data: newMessage, error: messageError } = await supabaseClient
    .from('messages')
    .insert({
      conversation_id: appConversationId,
      content: messageText,
      sender_participant_id: participantId,
      whatsapp_id: data.key.id // Store WhatsApp message ID for reference
    })
    .select();
  
  if (messageError) {
    console.error('Error creating message:', messageError);
    return false;
  }
  
  console.log(`Created new message in conversation ${appConversationId} from participant ${participantId}`);
  return true;
}

async function findOrCreateCustomer(supabaseClient, phoneNumber, contactName) {
  console.log(`Finding or creating customer with phone: ${phoneNumber}`);
  
  // Try to find existing customer
  const { data: existingCustomer, error: customerError } = await supabaseClient
    .from('customers')
    .select('id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error finding existing customer:', customerError);
    return null;
  }
  
  // If customer exists, return their ID
  if (existingCustomer) {
    console.log(`Found existing customer with ID: ${existingCustomer.id}`);
    return existingCustomer.id;
  }
  
  // Otherwise create new customer
  console.log(`Creating new customer with phone: ${phoneNumber}, name: ${contactName}`);
  
  const { data: newCustomer, error: createCustomerError } = await supabaseClient
    .from('customers')
    .insert({
      phone_number: phoneNumber,
      name: contactName || phoneNumber, // Use contactName if available, otherwise phone number
    })
    .select()
    .single();
  
  if (createCustomerError) {
    console.error('Error creating new customer:', createCustomerError);
    return null;
  }
  
  console.log(`Created new customer with ID: ${newCustomer.id}`);
  return newCustomer.id;
}

async function findOrCreateConversation(supabaseClient, remoteJid, config, fromMe) {
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

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received ${req.method} request to WhatsApp webhook`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const requestId = crypto.randomUUID();
      console.log(`[${requestId}] Processing webhook request`);
      
      // Log the raw request for debugging
      const rawBody = await req.clone().text();
      console.log(`[${requestId}] Raw request body:`, rawBody);
      
      // Parse the JSON body
      const body = JSON.parse(rawBody);
      console.log(`[${requestId}] Parsed webhook payload:`, JSON.stringify(body, null, 2));

      // Extract relevant data from the webhook
      const { event, data, instanceId } = body;
      console.log(`[${requestId}] Received ${event} event from instance ${instanceId}`);

      // Create Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Store the webhook event in evolution_webhook_events table
      const { error: webhookError } = await supabaseClient
        .from('evolution_webhook_events')
        .insert({
          event_type: event,
          payload: body,
          processing_status: 'pending',
          source_identifier: instanceId // Now optional
        });

      if (webhookError) {
        console.error(`[${requestId}] Error storing webhook event:`, webhookError);
        return createErrorResponse(webhookError);
      }
      
      // If this is a message event, handle conversation linking
      let processingResult = false;
      if (event === 'messages.upsert' && data) {
        processingResult = await handleMessageEvent(supabaseClient, data, instanceId);
      }

      // Return success response
      const responseBody = { success: true, processed: processingResult };
      console.log(`[${requestId}] Webhook processing completed. Response:`, JSON.stringify(responseBody));
      
      return new Response(
        JSON.stringify(responseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Return method not allowed for non-POST requests
    console.log('Received non-POST request to webhook endpoint');
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    );

  } catch (error) {
    console.error('Unhandled error in webhook processing:', error);
    return createErrorResponse(error);
  }
});
