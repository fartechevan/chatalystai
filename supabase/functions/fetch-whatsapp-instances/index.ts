import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Use correct relative path

console.log("--- fetch-whatsapp-instances: Function starting ---");

serve(async (req: Request) => {
  console.log("--- fetch-whatsapp-instances: Request received ---");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("--- fetch-whatsapp-instances: Handling OPTIONS request ---");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- fetch-whatsapp-instances: Inside try block ---");

    // 1. Get Evolution API config from environment variables (Ensure these are set in Supabase Function settings)
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");

    if (!evolutionApiKey || !evolutionApiUrl) {
      console.error("--- fetch-whatsapp-instances: Missing EVOLUTION_API_KEY or EVOLUTION_API_URL environment variables ---");
      // Return a clear error to the client
      return new Response(JSON.stringify({ error: "Server configuration error: Missing Evolution API credentials." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // 2. Construct the Evolution API URL
    const fetchUrl = `${evolutionApiUrl}/instance/fetchInstances`;
    console.log(`--- fetch-whatsapp-instances: Fetching from Evolution API: ${fetchUrl} ---`);

    // 3. Make the request to the Evolution API
    const evoResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json' // Good practice
      },
    });

    console.log(`--- fetch-whatsapp-instances: Evolution API response status: ${evoResponse.status} ---`);

    // 4. Check if the Evolution API request was successful and handle potential errors
    if (!evoResponse.ok) {
      let errorText = `Status: ${evoResponse.status} ${evoResponse.statusText}`;
      try {
        // Try to parse error details if the API returns JSON error
        const errorJson = await evoResponse.json();
        errorText += ` - ${JSON.stringify(errorJson)}`;
      } catch (e) {
        // Fallback to plain text if JSON parsing fails
        errorText += ` - ${await evoResponse.text()}`;
      }
      console.error(`--- fetch-whatsapp-instances: Error from Evolution API: ${errorText} ---`);
      // Return the Evolution API error details to the client
      return new Response(JSON.stringify({ error: `Failed to fetch instances from Evolution API: ${errorText}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: evoResponse.status, // Forward the status code
      });
    }

    // 5. Parse the JSON response from Evolution API
    const instances = await evoResponse.json();
    console.log("--- fetch-whatsapp-instances: Successfully fetched instances from Evolution API ---");

    // 6. Return the result to the client
    return new Response(JSON.stringify(instances), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("--- fetch-whatsapp-instances: Error in function execution ---", error);
    // Ensure error.message is captured correctly for unexpected errors
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during function execution.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Use 500 for internal server errors within the function itself
    });
  }
});

console.log("--- fetch-whatsapp-instances: Function setup complete, waiting for requests ---");
