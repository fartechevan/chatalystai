
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Updated to fully qualified URL
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts'; // Use Service Role for credentials
import { fetchIntegrationCredentialsById } from '../_shared/integrationUtils.ts'; // Use shared utility
import { parseRequest } from './utils.ts';

// Define the response structure expected by the caller
interface ResponsePayload {
  apiKey: string;
  baseUrl: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse Request Body
    const { integrationId } = await parseRequest(req);
    console.log(`Function: Received request for credentials, integrationId: ${integrationId}`);

    // 2. Create Supabase Admin Client (using Service Role Key)
    const supabaseAdminClient = createSupabaseServiceRoleClient();

    // 3. Fetch credentials using shared utility
    const { credentials, error: credError } = await fetchIntegrationCredentialsById(
      supabaseAdminClient,
      integrationId
    );

    // 4. Handle potential errors from fetching credentials
    if (credError || !credentials || !credentials.apiKey || !credentials.baseUrl) {
      console.error(`Function: Failed to retrieve valid credentials for ${integrationId}. Error: ${credError}`);
      const errorMessage = credError || "Required credentials (apiKey, baseUrl) not found or incomplete.";
      // Use 404 if the error indicates the integration wasn't found
      const status = typeof errorMessage === 'string' && errorMessage.includes("not found") ? 404 : 500;
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Prepare and return the successful response
    const responsePayload: ResponsePayload = {
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl, // Already cleaned in utility
    };

    console.log(`Function: Successfully retrieved credentials for ${integrationId}.`);
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Catch errors from parsing or unexpected issues
    console.error('Function: Error processing get-evolution-credentials request:', error.message);
    let status = 500;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message === "Missing required field: integrationId") status = 400;

    return new Response(JSON.stringify({ error: error.message }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
