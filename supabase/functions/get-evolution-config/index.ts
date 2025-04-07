import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Use correct relative path

console.log("--- get-evolution-config: Top level log ---");

serve(async (req: Request) => {
  console.log("--- get-evolution-config: Request received ---");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("--- get-evolution-config: Handling OPTIONS request ---");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- get-evolution-config: Inside try block ---");
    
    // Retrieve secrets from environment variables
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");

    if (!apiKey || !apiUrl) {
      console.error("--- get-evolution-config: Missing one or both secrets (EVOLUTION_API_KEY, EVOLUTION_API_URL) ---");
      return new Response(JSON.stringify({ error: "Server configuration error: API key or URL missing." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Return the secrets
    const configData = { 
      apiKey: apiKey, 
      apiUrl: apiUrl 
    };
    
    console.log("--- get-evolution-config: Returning config data ---");
    
    return new Response(JSON.stringify(configData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("--- get-evolution-config: Error ---", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
