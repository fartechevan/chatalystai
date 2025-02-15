
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const difyApiKey = Deno.env.get('DIFY_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.sender_id === msg.conversation.sender_id ? 'user' : 'assistant',
      content: msg.content
    }))

    const conversationText = formattedMessages
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n')

    const response = await fetch('https://api.dify.ai/v1/completion-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `Please summarize this conversation:\n${conversationText}`,
        response_mode: "blocking",
        user: "user-1"
      }),
    })

    const data = await response.json()
    console.log('Dify API response:', data)

    return new Response(JSON.stringify({ summary: data.answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in summarize-conversation function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
