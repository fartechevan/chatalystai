import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BigQuery } from "https://esm.sh/@google-cloud/bigquery@7.3.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('Starting BigQuery ETL process...');

    // Initialize BigQuery client
    const credentials = {
      client_email: Deno.env.get('GOOGLE_CLIENT_EMAIL'),
      private_key: Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    };

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Missing Google Cloud credentials');
    }

    const projectId = Deno.env.get('GOOGLE_PROJECT_ID');
    if (!projectId) {
      throw new Error('Missing GOOGLE_PROJECT_ID');
    }

    const bigquery = new BigQuery({
      credentials,
      projectId,
    });

    // Example query - modify this according to your needs
    const query = `
      SELECT *
      FROM \`your-dataset.your-table\`
      LIMIT 1000
    `;

    console.log('Executing BigQuery query...');
    const [rows] = await bigquery.query({ query });
    console.log(`Retrieved ${rows.length} rows from BigQuery`);

    // Insert data into Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/bigquery_etl_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        data: rows,
        processed_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to insert data: ${response.statusText}`);
    }

    console.log('ETL process completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data synced successfully',
        rowCount: rows.length 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in BigQuery ETL process:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});