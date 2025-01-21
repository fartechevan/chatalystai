import { createClient } from '@supabase/supabase-js'
import { BigQuery } from '@google-cloud/bigquery'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize BigQuery with credentials from environment
let bigquery: BigQuery;
try {
  const credentials = Deno.env.get('google_big_query');
  if (!credentials) {
    console.error('Missing google_big_query credentials');
    throw new Error('Missing BigQuery credentials');
  }
  
  const parsedCreds = JSON.parse(credentials);
  bigquery = new BigQuery({
    credentials: parsedCreds,
    projectId: parsedCreds.project_id,
  });
  console.log('BigQuery initialized successfully');
} catch (error) {
  console.error('Error initializing BigQuery:', error);
  throw error;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { activity_type, user_id, metadata } = await req.json()
    
    console.log('Received activity:', { activity_type, user_id, metadata })

    if (!activity_type || !user_id) {
      console.error('Missing required fields:', { activity_type, user_id });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})