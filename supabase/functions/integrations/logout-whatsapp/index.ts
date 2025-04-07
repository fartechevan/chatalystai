import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Server URL from environment variable
const evolutionServerUrl = Deno.env.get("EVOLUTION_API_URL");

if (!evolutionServerUrl) {
  console.error("Missing EVOLUTION_API_URL environment variable");
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure server URL is set
    if (!evolutionServerUrl) {
      throw new Error("Server configuration error: Evolution API URL missing.");
    }

    // Parse request body to get instanceId
    const { instanceId } = await req.json();
    if (!instanceId) {
      return new Response(JSON.stringify({ error: "instanceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client to invoke the key-fetching function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Invoke the get-evolution-key function to retrieve the API key
    console.log("Invoking get-evolution-key function for logout...");
    const { data: keyData, error: keyError } = await supabaseClient.functions.invoke('get-evolution-key');
    
    if (keyError || !keyData?.data) {
        console.error("Error invoking get-evolution-key function:", keyError);
        throw new Error(`Failed to retrieve Evolution API key: ${keyError?.message || 'No key data returned'}`);
    }
    const evolutionApiKey = keyData.data;
    console.log("Successfully retrieved Evolution API key for logout.");

    // Construct the Evolution API URL for logout
    const apiUrl = `${evolutionServerUrl}/instance/logout/${instanceId}`;
    console.log(`Supabase Function: Logging out via Evolution API: ${apiUrl}`);

    // Make the request to the Evolution API using the retrieved key
    const evoResponse = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "apikey": evolutionApiKey, 
      },
    });

    // Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Evolution API logout error (${evoResponse.status}): ${errorText}`);
       return new Response(JSON.stringify({ error: `Evolution API error: ${evoResponse.statusText}`, status: evoResponse.status, details: errorText }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: evoResponse.status, 
       });
    }

    // Logout successful, return success response
    console.log(`Supabase Function: Logout successful for ${instanceId}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in logout-whatsapp function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
