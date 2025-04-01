
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get secret value from environment variables
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_SECRET");
    
    console.log("Edge function retrieving API key - exists:", !!evolutionApiKey);
    
    if (!evolutionApiKey) {
      console.error("EVOLUTION_API_SECRET is not set in environment");
      return new Response(
        JSON.stringify({ error: "API key not configured in environment" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }

    // Return the API key
    return new Response(
      JSON.stringify({ 
        data: evolutionApiKey,
        message: "API key successfully retrieved"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error retrieving API key:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});
