import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from "https://esm.sh/openai@4.20.1"

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

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })

    // Get conversations without sentiment analysis
    const { data: conversations, error: fetchError } = await supabaseClient
      .from('conversations')
      .select('id, messages')
      .not('id', 'in', (select) =>
        select
          .from('sentiment_analysis')
          .select('conversation_id')
      )

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${conversations?.length} conversations to analyze`)

    for (const conversation of conversations || []) {
      // Convert messages to a string for analysis
      const messages = JSON.parse(conversation.messages as string)
      const messageText = messages
        .map((msg: any) => msg.content)
        .join('\n')

      // Analyze sentiment using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sentiment analyzer. Analyze the following conversation and respond with exactly one word: 'good', 'moderate', or 'bad'."
          },
          {
            role: "user",
            content: messageText
          }
        ]
      })

      const sentiment = completion.choices[0].message.content.toLowerCase().trim()

      // Insert sentiment analysis
      const { error: insertError } = await supabaseClient
        .from('sentiment_analysis')
        .insert({
          conversation_id: conversation.id,
          sentiment: sentiment as 'good' | 'moderate' | 'bad'
        })

      if (insertError) {
        console.error(`Error inserting sentiment for conversation ${conversation.id}:`, insertError)
      } else {
        console.log(`Analyzed sentiment for conversation ${conversation.id}: ${sentiment}`)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Sentiment analysis completed' }),
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