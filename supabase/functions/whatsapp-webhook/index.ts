
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
      console.log('Received webhook payload:', body)

      // Extract relevant data from the webhook
      const {
        instanceId,
        event,
        data,
      } = body

      // Log the webhook event details
      console.log(`Received ${event} event from instance ${instanceId}:`, data)

      // Create Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // First, store the webhook event in evolution_webhook_events table
      const { error: webhookError } = await supabaseClient
        .from('evolution_webhook_events')
        .insert({
          source_identifier: instanceId, // This is now optional
          event_type: event,
          payload: body, // Store the entire payload
          processing_status: 'pending'
        })

      if (webhookError) {
        console.error('Error storing webhook event:', webhookError)
        throw webhookError
      }
      
      // If this is a message event, handle conversation linking
      if (event === 'messages.upsert' && data && data.key && data.key.remoteJid) {
        const remoteJid = data.key.remoteJid
        const fromMe = data.key.fromMe || false
        
        // Try to find existing WhatsApp conversation by remoteJid
        const { data: existingConversation, error: conversationError } = await supabaseClient
          .from('evolution_whatsapp_conversations')
          .select('id, instance_id')
          .eq('remote_jid', remoteJid)
          .eq('instance_id', instanceId)
          .maybeSingle()
        
        if (conversationError) {
          console.error('Error finding existing conversation:', conversationError)
          throw conversationError
        }
        
        let whatsappConversationId
        
        // If no conversation exists, create one
        if (!existingConversation) {
          // Get contact name if available
          const contactName = data.pushName || remoteJid.split('@')[0]
          
          const { data: newConversation, error: createError } = await supabaseClient
            .from('evolution_whatsapp_conversations')
            .insert({
              remote_jid: remoteJid,
              instance_id: instanceId,
              contact_name: contactName,
              last_message_text: data.message?.conversation || data.message?.extendedTextMessage?.text || 'Media message',
              last_message_timestamp: data.messageTimestamp
            })
            .select()
            .single()
          
          if (createError) {
            console.error('Error creating new WhatsApp conversation:', createError)
            throw createError
          }
          
          whatsappConversationId = newConversation.id
          
          // Find config for this instance to get user reference
          const { data: config, error: configError } = await supabaseClient
            .from('integrations_config')
            .select('id, user_reference_id')
            .eq('instance_id', instanceId)
            .maybeSingle()
          
          if (configError) {
            console.error('Error fetching integration config:', configError)
            throw configError
          }
          
          if (config) {
            // Create a new app conversation if we have a config
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
            
            // Create admin participant (the owner of the WhatsApp)
            if (config.user_reference_id) {
              const { error: adminParticipantError } = await supabaseClient
                .from('conversation_participants')
                .insert({
                  conversation_id: appConversation.conversation_id,
                  role: 'admin',
                  user_id: config.user_reference_id
                })
              
              if (adminParticipantError) {
                console.error('Error creating admin participant:', adminParticipantError)
              }
            }
            
            // Create member participant (the WhatsApp contact)
            const { error: memberParticipantError } = await supabaseClient
              .from('conversation_participants')
              .insert({
                conversation_id: appConversation.conversation_id,
                role: 'member',
                external_user_identifier: remoteJid
              })
            
            if (memberParticipantError) {
              console.error('Error creating member participant:', memberParticipantError)
            }
          }
        } else {
          whatsappConversationId = existingConversation.id
          
          // Update last message info
          await supabaseClient
            .from('evolution_whatsapp_conversations')
            .update({
              last_message_text: data.message?.conversation || data.message?.extendedTextMessage?.text || 'Media message',
              last_message_timestamp: data.messageTimestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', whatsappConversationId)
        }
        
        // Store the message
        if (whatsappConversationId) {
          const { error: messageError } = await supabaseClient
            .from('evolution_whatsapp_messages')
            .insert({
              conversation_id: whatsappConversationId,
              message_id: data.key.id,
              from_me: fromMe,
              message_text: data.message?.conversation || data.message?.extendedTextMessage?.text || null,
              message_type: Object.keys(data.message || {})[0] || 'unknown',
              message_timestamp: data.messageTimestamp,
              message_data: data
            })
          
          if (messageError) {
            console.error('Error storing WhatsApp message:', messageError)
          }
        }
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
