
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVO_API_BASE_URL = 'https://api.evoapicloud.com'; // Extracted base URL

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

  // Get API key from environment variable
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!apiKey) {
    console.error('Missing EVOLUTION_API_KEY environment variable');
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Parse URL to get the path
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'GET' && path.includes('/instance/fetchInstances')) {
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };

    try {
      const response = await fetch(EVO_API_BASE_URL + '/instance/fetchInstances', options);
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
  } else if (req.method === 'GET' && path.includes('/instance/connectionState/')) {
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };
    const instanceId = path.split('/').pop(); // Extract instance from URL
    const apiUrl = `${EVO_API_BASE_URL}/instance/connectionState/${instanceId}`;

    try {
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
  } else if (req.method === 'GET' && path.includes('/instance/connect/')) {
    const options = {
      method: 'GET',
      headers: { apikey: apiKey }
    };
    const instance = path.split('/').pop(); // Extract instance from URL
    const apiUrl = `${EVO_API_BASE_URL}/instance/connect/${instance}`;

    try {
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
  } else if (req.method === 'POST' && path.includes('/message/sendText/')) {
    try {
      const body = await req.json();
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
