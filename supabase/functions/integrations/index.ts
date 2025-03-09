
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      // Extract request body
      let body: RequestBody;
      try {
        body = await req.json();
        console.log('Request body:', body);
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

      // Fetch API key from the database
      const { data, error } = await supabaseClient
        .from('integration_config')
        .select('api_key')
        .eq('id', HARDCODED_INTEGRATION_ID)
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

      // Format the request to send to WhatsApp API
      try {
        const { number, text, instanceId } = body;
        
        // Log the request details for debugging
        console.log(`Sending WhatsApp message: number=${number}, instanceId=${instanceId}`);

        const apiUrl = `${EVO_API_BASE_URL}/message/sendText/${instanceId}`;
        console.log('Calling Evolution API URL:', apiUrl);

        const options = {
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: number,
            options: {
              delay: 1200
            },
            textMessage: {
              text: text
            }
          })
        };

        console.log('Evolution API request options:', JSON.stringify(options, null, 2));

        // Send the request to the WhatsApp API
        const response = await fetch(apiUrl, options);
        const data = await response.json();
        
        console.log('WhatsApp API response:', data);

        return new Response(
          JSON.stringify(data), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
          }
        );
      } catch (err) {
        console.error('Error sending WhatsApp message:', err);
        return new Response(
          JSON.stringify({ error: err.message }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
