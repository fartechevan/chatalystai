import { createClient } from '@supabase/supabase-js'
import { BigQuery } from '@google-cloud/bigquery'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
}

// Initialize BigQuery with credentials from environment
const bigquery = new BigQuery({
  credentials: JSON.parse(Deno.env.get('google_big_query') || '{}'),
  projectId: JSON.parse(Deno.env.get('google_big_query') || '{}').project_id,
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { activity_type, user_id, metadata } = await req.json()
    
    console.log('Received activity:', { activity_type, user_id, metadata })

    // Insert data into BigQuery
    const dataset = bigquery.dataset('user_activity')
    const table = dataset.table('events')

    const rows = [{
      timestamp: new Date().toISOString(),
      user_id,
      activity_type,
      metadata: JSON.stringify(metadata),
    }]

    await table.insert(rows)
    console.log('Successfully inserted activity into BigQuery')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error tracking activity:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})