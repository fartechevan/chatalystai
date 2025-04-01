
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client for accessing the database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get various fallback sources for the API key
    const apiKey = await getApiKey(supabaseClient);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not found in any location" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 404 
        }
      );
    }

    // Return the API key
    return new Response(
      JSON.stringify({ 
        data: apiKey,
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

// Function to get API key from various sources with fallbacks
async function getApiKey(supabaseClient: any): Promise<string | null> {
  // Try environment variable first (edge function secrets)
  const envApiKey = Deno.env.get("EVOLUTION_API_SECRET");
  if (envApiKey) {
    console.log("Retrieved API key from environment variable");
    return envApiKey;
  }
  
  // Try database next
  try {
    console.log("Trying to get API key from integrations_config table...");
    const { data, error } = await supabaseClient
      .from('integrations_config')
      .select('api_key')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error("Database query error:", error);
    } else if (data && data.length > 0 && data[0].api_key) {
      console.log("Retrieved API key from database");
      return data[0].api_key;
    }
  } catch (dbError) {
    console.error("Database access error:", dbError);
  }
  
  // Fallback to hard-coded API key for testing - DO NOT USE IN PRODUCTION
  console.log("Using fallback API key for testing");
  return "TEMP_DEV_KEY_FOR_TESTING_ONLY";
}
