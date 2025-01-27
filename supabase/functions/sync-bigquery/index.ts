import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BigQuery } from 'https://esm.sh/@google-cloud/bigquery';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
};

// Initialize BigQuery client
const initBigQuery = () => {
  const credentials = {
    projectId: 'fartech-yvqj',
    credentials: {
      client_email: Deno.env.get('GOOGLE_CLIENT_EMAIL'),
      private_key: Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    },
  };

  return new BigQuery(credentials);
};

// Initialize Supabase client
const initSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Starting BigQuery sync process...');
    
    // Initialize clients
    const bigquery = initBigQuery();
    const supabase = initSupabase();
    
    // Create a new sync record
    const { data: syncRecord, error: insertError } = await supabase
      .from('blue_ice_sync')
      .insert([{ sync_status: 'pending' }])
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create sync record: ${insertError.message}`);
    
    console.log('Created sync record:', syncRecord.id);

    // Query BigQuery
    const query = `
      SELECT *
      FROM \`fartech-yvqj.blueice_data.blue_ice_bq\`
    `;

    console.log('Executing BigQuery query...');
    const [rows] = await bigquery.query({ query });
    
    // Update the sync record with the data
    const { error: updateError } = await supabase
      .from('blue_ice_sync')
      .update({
        data: rows,
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', syncRecord.id);

    if (updateError) throw new Error(`Failed to update sync record: ${updateError.message}`);
    
    console.log('Sync completed successfully');

    return new Response(
      JSON.stringify({ success: true, syncId: syncRecord.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);

    // If we have a sync record ID, update it with the error
    if (error.syncId) {
      const supabase = initSupabase();
      await supabase
        .from('blue_ice_sync')
        .update({
          sync_status: 'failed',
          error_message: error.message,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', error.syncId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});