
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('Received webhook payload:', JSON.stringify(body, null, 2))

      // Extract relevant data from the webhook
      const { event, data, instanceId } = body

      // Log the webhook event details
      console.log(`Received ${event} event from instance ${instanceId}:`, JSON.stringify(data, null, 2))

      // Create Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Store the webhook event in evolution_webhook_events table
      const { error: webhookError } = await supabaseClient
        .from('evolution_webhook_events')
        .insert({
          event_type: event,
          payload: body,
          processing_status: 'pending',
          source_identifier: instanceId // Now optional
        })

      if (webhookError) {
        console.error('Error storing webhook event:', webhookError)
        throw webhookError
      }
      
      // If this is a message event, handle conversation linking
      if (event === 'messages.upsert' && data && data.key && data.key.remoteJid) {
        const remoteJid = data.key.remoteJid
        const fromMe = data.key.fromMe || false
        const contactName = data.pushName || remoteJid.split('@')[0]
        const messageText = data.message?.conversation || 
                          data.message?.extendedTextMessage?.text || 
                          'Media message'
        
        console.log(`Processing message from ${fromMe ? 'owner' : 'customer'} ${contactName} (${remoteJid}): ${messageText}`)
        
        // First, check if integration config exists for this instance
        const { data: config, error: configError } = await supabaseClient
          .from('integrations_config')
          .select('id, user_reference_id')
          .eq('instance_id', instanceId)
          .maybeSingle()
        
        if (configError) {
          console.error('Error fetching integration config:', configError)
          throw configError
        }
        
        if (!config) {
          console.error('No integration config found for instance:', instanceId)
          return new Response(
            JSON.stringify({ success: false, error: 'Integration config not found' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404
            }
          )
        }

        // Extract phone number from remoteJid
        const phoneNumber = remoteJid.split('@')[0]
        console.log(`Extracted phone number: ${phoneNumber}`)
        
        // Check if customer exists or create a new one
        let customerId = null
        const { data: existingCustomer, error: customerError } = await supabaseClient
          .from('customers')
          .select('id')
          .eq('phone_number', phoneNumber)
          .maybeSingle()
        
        if (customerError) {
          console.error('Error finding existing customer:', customerError)
          throw customerError
        }
        
        if (existingCustomer) {
          customerId = existingCustomer.id
          console.log(`Found existing customer with ID: ${customerId}`)
        } else {
          console.log(`Creating new customer with phone: ${phoneNumber}, name: ${contactName}`)
          const { data: newCustomer, error: createCustomerError } = await supabaseClient
            .from('customers')
            .insert({
              phone_number: phoneNumber,
              name: contactName || phoneNumber, // Use pushName if available, otherwise phone number
            })
            .select()
            .single()
          
          if (createCustomerError) {
            console.error('Error creating new customer:', createCustomerError)
            throw createCustomerError
          }
          
          customerId = newCustomer.id
          console.log(`Created new customer with ID: ${customerId}`)
        }
        
        // Find existing conversation via participants table
        let appConversationId = null
        let participantId = null
        
        // Check if the participant exists by looking for their external_user_identifier
        const { data: existingParticipant, error: participantError } = await supabaseClient
          .from('conversation_participants')
          .select('id, conversation_id')
          .eq('external_user_identifier', remoteJid)
          .maybeSingle()
        
        if (participantError) {
          console.error('Error finding existing participant:', participantError)
          throw participantError
        }
        
        if (existingParticipant) {
          // Found existing conversation via participant
          appConversationId = existingParticipant.conversation_id
          participantId = existingParticipant.id
          console.log(`Found existing conversation ${appConversationId} for ${remoteJid}`)

          // Update conversation timestamp
          await supabaseClient
            .from('conversations')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('conversation_id', appConversationId)
            
        } else {
          console.log(`No existing conversation found for ${remoteJid}, creating new one`)
          
          // Transaction to create conversation and participants
          
          // 1. Create a new app conversation linked to the integration config
          const { data: appConversation, error: appConversationError } = await supabaseClient
            .from('conversations')
            .insert({
              integrations_config_id: config.id
            })
            .select()
            .single()
          
          if (appConversationError) {
            console.error('Error creating app conversation:', appConversationError)
            throw appConversationError
          }
          
          appConversationId = appConversation.conversation_id
          console.log(`Created new conversation with ID: ${appConversationId}`)
          
          // 2. Create admin participant (the owner of the WhatsApp)
          if (config.user_reference_id) {
            const { data: adminParticipant, error: adminParticipantError } = await supabaseClient
              .from('conversation_participants')
              .insert({
                conversation_id: appConversationId,
                role: 'admin',
                user_id: config.user_reference_id
              })
              .select()
              .single()
            
            if (adminParticipantError) {
              console.error('Error creating admin participant:', adminParticipantError)
            } else {
              console.log(`Created admin participant for conversation ${appConversationId}`)
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
            .single()
          
          if (memberParticipantError) {
            console.error('Error creating member participant:', memberParticipantError)
            throw memberParticipantError
          }
          
          participantId = memberParticipant.id
          console.log(`Created member participant with ID: ${participantId}`)
        }
        
        // At this point, we have either found or created a conversation and participant
        // Now we can store the message
        
        if (fromMe) {
          // Message from WhatsApp owner - find admin participant
          const { data: adminParticipant, error: adminParticipantError } = await supabaseClient
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', appConversationId)
            .eq('role', 'admin')
            .maybeSingle()
          
          if (adminParticipantError) {
            console.error('Error finding admin participant:', adminParticipantError)
            throw adminParticipantError
          }
          
          if (adminParticipant) {
            participantId = adminParticipant.id
            console.log(`Using admin participant ID: ${participantId} for fromMe message`)
          } else {
            console.error('Admin participant not found for conversation:', appConversationId)
          }
        } else {
          // Message from customer - find member participant with matching remoteJid
          const { data: memberParticipant, error: memberParticipantError } = await supabaseClient
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', appConversationId)
            .eq('external_user_identifier', remoteJid)
            .maybeSingle()
          
          if (memberParticipantError) {
            console.error('Error finding member participant:', memberParticipantError)
            throw memberParticipantError
          }
          
          if (memberParticipant) {
            participantId = memberParticipant.id
            console.log(`Using member participant ID: ${participantId} for customer message`)
          }
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
          .select()
        
        if (messageError) {
          console.error('Error creating message:', messageError)
          throw messageError
        }
        
        console.log(`Created new message in conversation ${appConversationId} from participant ${participantId}`)
      }

      // Return success response
      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Return method not allowed for non-POST requests
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
