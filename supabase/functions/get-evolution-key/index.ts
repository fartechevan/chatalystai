
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Import SupabaseClient type along with createClient
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
// Use the imported SupabaseClient type
async function getApiKey(supabaseClient: SupabaseClient): Promise<string | null> {
  // Try environment variable first (edge function secrets)
  const envApiKey = Deno.env.get("EVOLUTION_API_KEY");
  if (envApiKey) {
    console.log("Retrieved API key from environment variable");
    return envApiKey;
  }
  
  // Try database next using RPC function to access the api_key column
  try {
    console.log("Trying to get API key from integrations_config table...");
    const { data, error } = await supabaseClient
      .rpc('get_api_key_from_config');
      
    if (error) {
      console.error("Database query error:", error);
    } else if (data) {
      console.log("Retrieved API key from database");
      return data;
    }
  } catch (dbError) {
    console.error("Database access error:", dbError);
  }
  
  // Use the vault function as another fallback
  try {
    const { data: vaultData, error: vaultError } = await supabaseClient
      .rpc('get_evolution_api_key');
      
    if (vaultError) {
      console.error("Vault query error:", vaultError);
    } else if (vaultData) {
      console.log("Retrieved API key from vault");
      return vaultData;
    }
  } catch (vaultError) {
    console.error("Vault access error:", vaultError);
  }
  
  // If key not found in any source, return null
  console.error("API key not found in environment, database, or vault.");
  return null; 
}
