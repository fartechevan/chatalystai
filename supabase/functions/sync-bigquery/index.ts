import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { BigQuery } from "https://esm.sh/@google-cloud/bigquery@7.9.1"

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
    console.log("Starting BigQuery sync...")

    // Initialize BigQuery with credentials
    const credentials = {
      projectId: Deno.env.get("GOOGLE_PROJECT_ID"),
      credentials: {
        client_email: Deno.env.get("GOOGLE_CLIENT_EMAIL"),
        private_key: Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, '\n'),
      },
    }

    // Validate credentials before initializing BigQuery
    if (!credentials.projectId || !credentials.credentials.client_email || !credentials.credentials.private_key) {
      throw new Error("Missing required Google Cloud credentials");
    }

    console.log("BigQuery configuration initialized with project:", credentials.projectId);

    // Initialize BigQuery with proper configuration object
    const bigquery = new BigQuery({
      projectId: credentials.projectId,
      credentials: {
        client_email: credentials.credentials.client_email,
        private_key: credentials.credentials.private_key,
      },
    });
    
    // Generate a sync ID
    const syncId = crypto.randomUUID();
    console.log(`Sync started with ID: ${syncId}`);

    // Your BigQuery sync logic here
    // For now, we'll just return success
    const data = {
      syncId,
      status: 'success',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error("Error in sync-bigquery function:", error);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
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