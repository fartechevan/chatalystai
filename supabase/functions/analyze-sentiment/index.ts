
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversationId } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch conversation messages
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('messages')
      .eq('id', conversationId)
      .single()

    if (conversationError) throw conversationError

    // Format messages for OpenAI
    const messages = conversation.messages.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    // Analyze sentiment with OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the conversation and determine its sentiment. Respond with a JSON object containing: sentiment (either "bad", "moderate", or "good") and a brief description explaining why. Focus on the effectiveness of the conversation in terms of helping the customer.'
          },
          ...messages
        ]
      })
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json()
    const analysis = JSON.parse(openAIData.choices[0].message.content)

    // Store sentiment analysis
    const { data: sentimentData, error: sentimentError } = await supabaseClient
      .from('sentiment_analysis')
      .upsert({
        conversation_id: conversationId,
        sentiment: analysis.sentiment,
        description: analysis.description
      })
      .select()
      .single()

    if (sentimentError) throw sentimentError

    return new Response(
      JSON.stringify(sentimentData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in analyze-sentiment function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
