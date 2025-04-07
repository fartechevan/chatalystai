import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Import Supabase client
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

    // Create Supabase client to invoke the key-fetching function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Invoke the get-evolution-key function to retrieve the API key
    console.log("Invoking get-evolution-key function...");
    const { data: keyData, error: keyError } = await supabaseClient.functions.invoke('get-evolution-key');
    
    if (keyError || !keyData?.data) {
        console.error("Error invoking get-evolution-key function:", keyError);
        throw new Error(`Failed to retrieve Evolution API key: ${keyError?.message || 'No key data returned'}`);
    }
    const evolutionApiKey = keyData.data;
    console.log("Successfully retrieved Evolution API key.");

    // Parse request body to get instanceId
    const { instanceId } = await req.json();
    if (!instanceId) {
      return new Response(JSON.stringify({ error: "instanceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct the Evolution API URL
    const apiUrl = `${evolutionServerUrl}/instance/connect/${instanceId}`;
    console.log(`Supabase Function: Connecting to Evolution API: ${apiUrl}`);

    // Make the request to the Evolution API using the retrieved key
    const evoResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey, // Use the key fetched from the function
      },
    });

    // Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Evolution API error (${evoResponse.status}): ${errorText}`);
      throw new Error(`Failed to connect to Evolution instance: ${evoResponse.statusText}`);
    }

    // Parse the JSON response from Evolution API
    const result = await evoResponse.json();
    console.log("Supabase Function: Received response from Evolution API:", result);

    // Return the successful response from Evolution API to the frontend
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Supabase function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
