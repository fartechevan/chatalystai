import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query sentiment analysis data grouped by date
    const { data, error } = await supabaseClient
      .from('sentiment_analysis')
      .select('created_at, sentiment')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Process data for the chart
    const processedData = data.reduce((acc: any[], curr: any) => {
      const date = new Date(curr.created_at).toISOString().split('T')[0]
      const existingDate = acc.find(item => item.date === date)

      if (existingDate) {
        existingDate.count += 1
        switch (curr.sentiment) {
          case 'good':
            existingDate.sentiment_score += 1
            break
          case 'bad':
            existingDate.sentiment_score -= 1
            break
          // moderate keeps the score unchanged
        }
      } else {
        acc.push({
          date,
          count: 1,
          sentiment_score: curr.sentiment === 'good' ? 1 : curr.sentiment === 'bad' ? -1 : 0
        })
      }

      return acc
    }, [])

    return new Response(
      JSON.stringify({ data: processedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in fetch-sentiment function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
