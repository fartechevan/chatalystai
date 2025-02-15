
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

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
    const { messages } = await req.json()
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.sender_id === msg.conversation.sender_id ? 'user' : 'assistant',
      content: msg.content
    }))

    console.log('Calling OpenAI with formatted messages:', formattedMessages)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes conversations. Keep summaries concise and highlight key points.'
          },
          {
            role: 'user',
            content: `Please summarize this conversation:\n${formattedMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`
          }
        ],
      }),
    })

    const data = await response.json()
    console.log('OpenAI API response:', data)

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI')
    }

    return new Response(JSON.stringify({ summary: data.choices[0].message.content }), {
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
