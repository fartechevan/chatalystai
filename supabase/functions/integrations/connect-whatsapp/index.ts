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
    // --- DEBUG LOGGING: Remove after troubleshooting ---
    console.log(`Supabase Function: Using API Key: ${evolutionApiKey}`);
    console.log(`Supabase Function: Using Instance ID: ${instanceId}`);
    // --- END DEBUG LOGGING ---

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
      // Log the actual response body from Evolution API for better debugging
      console.error(`Evolution API request failed with status ${evoResponse.status}. Response body: ${errorText}`);
      // Return the specific error from Evolution API back to the frontend
      return new Response(JSON.stringify({ error: `Evolution API Error (${evoResponse.status}): ${errorText}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: evoResponse.status, // Use the status code from Evolution API
      });
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
    // Catch errors like failing to fetch the API key or other unexpected issues
    console.error("Error within Supabase function (connect-whatsapp):", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error.";
    return new Response(JSON.stringify({ error: `Supabase Function Error: ${errorMessage}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Internal server error for issues within the function itself
    });
  }
});
