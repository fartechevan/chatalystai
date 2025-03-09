import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js'

interface RequestBody {
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

const HARDCODED_INTEGRATION_ID = 'bda44db7-4e9a-4733-a9c7-c4f5d7198905';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Extract request body
  let body: any;
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

  // Fetch API key and instance ID from the database
  const { data, error } = await supabaseClient
    .from('integration_config')
    .select('api_key, instance_id')
    .eq('id', HARDCODED_INTEGRATION_ID)
    .single();

  if (error) {
    console.error('Error fetching API key and instance ID from database:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch API key and instance ID from database' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = data.api_key;
  const instanceId = data.instance_id;

  if (!apiKey || !instanceId) {
    console.error('API key or instance ID not found in database');
    return new Response(
      JSON.stringify({ error: 'API key or instance ID not configured in database' }),
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

      const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instanceId}`;

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
