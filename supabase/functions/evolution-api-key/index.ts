
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API key from environment variables
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!apiKey) {
      console.error("EVOLUTION_API_KEY is not set in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "API key not configured on server",
          data: null 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    // Return the API key
    return new Response(
      JSON.stringify({ 
        data: { apiKey },
        error: null 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in evolution-api-key function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        data: null 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
