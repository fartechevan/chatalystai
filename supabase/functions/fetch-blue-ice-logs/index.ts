import { serve } from "https://deno.fresh.runtime.dev";
import { BigQuery } from "npm:@google-cloud/bigquery";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bigquery = new BigQuery({
      projectId: Deno.env.get('PROJECT_ID'),
      credentials: {
        client_email: Deno.env.get('GOOGLE_CLIENT_EMAIL'),
        private_key: Deno.env.get('GOOGLE_PRIVATE_KEY'),
      },
    });

    const query = `
      SELECT 
        incoming,
        response
      FROM \`your-project.your-dataset.blue_ice_data_logs\`
    `;

    const [rows] = await bigquery.query({ query });
    
    return new Response(
      JSON.stringify(rows),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});