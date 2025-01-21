import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    
    // Create BigQuery client using native fetch
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

    const response = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/fartech-yvqj/queries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        useLegacySql: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`BigQuery API error: ${response.statusText}`);
    }

    const result = await response.json();
    const rows = result.rows || [];
    
    return new Response(
      JSON.stringify({ data: rows }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in fetch-sentiment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})