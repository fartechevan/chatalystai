import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { messages, sessionId, userId } = await req.json()

    console.log('Received conversation data:', { sessionId, userId, messageCount: messages.length })

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format')
    }

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    // Format messages to match our schema
    const formattedMessages = messages.map(msg => ({
      sender: msg.role === 'user' ? 'user' : 'bot',
      content: msg.content,
      timestamp: new Date().toISOString()
    }))

    // Insert the conversation
    const { data, error } = await supabaseClient
      .from('conversations')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        messages: formattedMessages
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting conversation:', error)
      throw error
    }

    console.log('Successfully synced conversation:', data.id)

    return new Response(
      JSON.stringify({ success: true, conversationId: data.id }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in sync-typebot-conversation function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})