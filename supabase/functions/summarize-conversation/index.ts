import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, messages } = await req.json()

    if (action === 'get-usage-stats') {
      // This would normally connect to your logging/monitoring system
      // For demo purposes, returning mock data
      return new Response(
        JSON.stringify({
          totalInvocations: 1234,
          avgResponseTime: 245.6,
          successRate: 0.985,
          dailyStats: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            invocations: Math.floor(Math.random() * 100) + 20
          }))
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const prompt = `
      You are an expert at summarizing conversations. Please provide a concise summary of the following conversation:

      ${messages.map((message) => `${message.sender_id}: ${message.content}`).join('\n')}

      Summary:
    `

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API Error:', response.status, response.statusText)
      const errorBody = await response.text()
      console.error('Error Body:', errorBody)
      throw new Error(`OpenAI API request failed with status ${response.status}`)
    }

    const jsonResponse = await response.json()
    const summary = jsonResponse?.choices?.[0]?.message?.content?.trim() || null

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
