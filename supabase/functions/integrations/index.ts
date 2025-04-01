
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// This is a stub implementation for the integrations function that was referenced in config.toml
// but was missing its actual implementation. We'll implement a basic structure here that can
// be expanded later as needed.

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for integrations function');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body if it exists
    let body = {};
    try {
      if (req.body) {
        const bodyText = await req.text();
        if (bodyText) {
          body = JSON.parse(bodyText);
        }
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create a Supabase client with the auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse URL to get path parts and query parameters
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Remove 'functions' and 'v1' and 'integrations' from the path parts
    const resourcePath = pathParts.slice(3).join('/');

    console.log(`Processing integrations request for path: ${resourcePath}`);

    // Handle different integration endpoints based on the resourcePath
    if (resourcePath === 'status') {
      return new Response(
        JSON.stringify({ 
          status: 'operational',
          message: 'Integrations function is running' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else if (resourcePath === 'list') {
      // Fetch integrations from the database
      const { data, error } = await supabaseClient
        .from('integrations')
        .select('*');

      if (error) {
        console.error('Error fetching integrations:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch integrations' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else if (resourcePath.startsWith('message/sendText')) {
      // This is a stub for sending a WhatsApp message
      // You would implement actual integration with the Evolution API here
      
      const { instanceId, number, text } = body as any;
      
      if (!instanceId || !number || !text) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: instanceId, number, or text' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      console.log(`Sending WhatsApp message to ${number} via instance ${instanceId}`);
      
      // This is where you would implement the actual message sending
      // For now, we'll just return a success response
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Message sending simulation successful',
          messageId: `simulated_${Date.now()}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      // Handle unknown paths
      return new Response(
        JSON.stringify({ 
          error: 'Not found',
          message: `Unknown endpoint: ${resourcePath}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }
  } catch (error) {
    console.error('Unhandled error in integrations function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
