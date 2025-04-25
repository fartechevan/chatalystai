/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Updated to use fully qualified URL
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts"; // Use Service Role for credentials
import { fetchIntegrationCredentialsById } from "../_shared/integrationUtils.ts"; // Use shared utility
import { parseRequest } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse Request Body
    const { integrationId } = await parseRequest(req);

    // 2. Create Supabase Service Role Client
    const supabaseClient = createSupabaseServiceRoleClient();

    // 3. Get credentials using shared utility
    const { credentials, error: credError } = await fetchIntegrationCredentialsById(
        supabaseClient,
        integrationId
    );

    // 4. Construct Diagnostic Response
    const apiKeyStatus = credentials?.apiKey
      ? `Retrieved from DB (length: ${credentials.apiKey.length})`
      : `Not found/null in DB for ID ${integrationId} (Error: ${credError || 'Unknown'})`;

    const baseUrlStatus = credentials?.baseUrl
      ? `Retrieved from DB: ${credentials.baseUrl}`
      : `Not found/null in DB for ID ${integrationId} (Error: ${credError || 'Unknown'})`;

    const responseBody = {
      EVOLUTION_API_KEY_STATUS: apiKeyStatus,
      EVOLUTION_API_URL_STATUS: baseUrlStatus,
      // Add checks for other secrets if needed
    };

    // 5. Determine Status Code
    // Return 200 if *both* key and URL were successfully retrieved (not null)
    const status = (credentials?.apiKey && credentials?.baseUrl) ? 200 : 404;

    // 6. Return Response
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });

  } catch (error) {
    // Catch errors from parsing or unexpected issues
    console.error("Error in test-secrets handler:", error.message);
    let status = 500;
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message.includes("integration_id")) status = 400; // Missing integration_id

    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });
  }
});
