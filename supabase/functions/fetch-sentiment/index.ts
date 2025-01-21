import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { BigQuery } from "https://googleapis.deno.dev/bigquery/v2.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const credentials = JSON.parse(Deno.env.get('google_big_query') || '{}')
    const bigquery = new BigQuery({ credentials })

    const query = `
      SELECT 
        sentiment_score,
        COUNT(*) as count,
        TIMESTAMP_TRUNC(created_at, DAY) as date
      FROM \`fartech-yvqj.skyworld_gpt.sentiment_data\`
      GROUP BY sentiment_score, date
      ORDER BY date DESC
      LIMIT 100
    `

    const [rows] = await bigquery.query(query)
    
    return new Response(
      JSON.stringify({ data: rows }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})