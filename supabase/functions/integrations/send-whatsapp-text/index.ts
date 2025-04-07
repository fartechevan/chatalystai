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

    // Parse request body to get instanceId and payload
    const { instanceId, payload } = await req.json();
    if (!instanceId || !payload || !payload.number || !payload.text) {
      return new Response(JSON.stringify({ error: "instanceId, number, and text are required in payload" }), {
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
    console.log("Invoking get-evolution-key function for send text...");
    const { data: keyData, error: keyError } = await supabaseClient.functions.invoke('get-evolution-key');
    
    if (keyError || !keyData?.data) {
        console.error("Error invoking get-evolution-key function:", keyError);
        throw new Error(`Failed to retrieve Evolution API key: ${keyError?.message || 'No key data returned'}`);
    }
    const evolutionApiKey = keyData.data;
    console.log("Successfully retrieved Evolution API key for send text.");

    // Construct the Evolution API URL for sending text
    const apiUrl = `${evolutionServerUrl}/message/sendText/${instanceId}`;
    console.log(`Supabase Function: Sending text via Evolution API: ${apiUrl}`);

    // Make the request to the Evolution API using the retrieved key and payload
    const evoResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey, 
      },
      body: JSON.stringify(payload), // Send the payload received from the client
    });

    // Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Evolution API send text error (${evoResponse.status}): ${errorText}`);
       return new Response(JSON.stringify({ error: `Evolution API error: ${evoResponse.statusText}`, status: evoResponse.status, details: errorText }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: evoResponse.status, 
       });
    }

    // Parse the JSON response from Evolution API
    const result = await evoResponse.json();
    console.log(`Supabase Function: Send text response from Evolution API for ${instanceId}:`, result);

    // Return the successful response from Evolution API to the frontend
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in send-whatsapp-text function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
