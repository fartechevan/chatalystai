
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js'

interface RequestBody {
  integrationId: string;
  number: string;
  text: string;
  instanceId: string;
}

const EVO_API_BASE_URL = 'https://api.evoapicloud.com'; // Extracted base URL

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  Deno.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Extract request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Extract integrationId from the request body
  const integrationId = body.integrationId;

  if (!integrationId) {
    console.error("Missing integrationId in request body");
    return new Response(
      JSON.stringify({ error: "Missing integrationId in request body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Fetch API key from the database
  const { data, error } = await supabaseClient
    .from('integration_config')
    .select('api_key')
    .eq('id', integrationId)
    .single();

  if (error) {
    console.error('Error fetching API key from database:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch API key from database' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = data.api_key;

  if (!apiKey) {
    console.error('API key not found in database');
    return new Response(
      JSON.stringify({ error: 'API key not configured in database' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (req.method === 'POST' && path.includes('/message/sendText/')) {
    try {
      const options = {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      };

      const instance = path.split('/').pop(); // Extract instance from URL
      const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instance}`;

      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return new Response(
        JSON.stringify(data), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    } catch (err) {
      console.error(err);
      return new Response(
        JSON.stringify({ error: err.message }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
