import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define the expected request body structure
interface RequestPayload {
  integrationId: string;
}

// Define the expected structure within decrypted_credentials
interface DecryptedCredentials {
  EVOLUTION_API_KEY?: string;
  EVOLUTION_API_URL?: string;
  // Add other potential credential fields if needed
}

// Define the response structure
interface ResponsePayload {
  apiKey: string;
  baseUrl: string;
  // Include metadata if it's also stored/needed, otherwise omit
}

// Internal function to fetch credentials using Admin client
async function fetchCredentialsFromDb(supabaseAdminClient: SupabaseClient, integrationId: string): Promise<DecryptedCredentials> {
  console.log(`Function: Fetching decrypted_credentials for integration ID: ${integrationId}`);
  const { data, error } = await supabaseAdminClient
    .from('integrations')
    .select('decrypted_credentials') // Select the specific column
    .eq('id', integrationId)
    .single();

  if (error) {
    console.error(`Function: Error fetching integration ${integrationId}:`, error);
    if (error.code === 'PGRST116') { // Not found
        throw new Error(`Integration with ID ${integrationId} not found.`);
      }
    throw new Error(`Supabase error fetching integration: ${error.message}`);
  }

  if (!data || !data.decrypted_credentials) {
    console.error(`Function: No decrypted_credentials found for integration ${integrationId}`);
    throw new Error('Decrypted credentials not found for this integration.');
  }

  // Assuming decrypted_credentials is a JSON object
  const credentials = data.decrypted_credentials as DecryptedCredentials;
  console.log(`Function: Decrypted credentials fetched successfully for ${integrationId}.`);

  return credentials;
}


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check Authorization (optional but recommended for user-specific data)
    //    If needed, create a user-context client here as in send-evolution-text.
    //    For fetching credentials, using only the admin client might be sufficient
    //    if the function's purpose is solely secure credential retrieval based on ID.

    // 2. Parse request body
    const { integrationId }: RequestPayload = await req.json();
    if (!integrationId) {
      return new Response(JSON.stringify({ error: 'Missing required field: integrationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Function: Received request for credentials, integrationId: ${integrationId}`);


    // 3. Create Supabase Admin Client (using Service Role Key)
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } } // Important for server-side clients
    );

    // 4. Fetch credentials from DB
    const credentials = await fetchCredentialsFromDb(supabaseAdminClient, integrationId);

    // 5. Validate required credentials from the decrypted object
    const apiKey = credentials.EVOLUTION_API_KEY;
    const baseUrl = credentials.EVOLUTION_API_URL;

    if (!apiKey || !baseUrl) {
      const missing: string[] = []; // Explicitly type the array
      if (!apiKey) missing.push("EVOLUTION_API_KEY");
      if (!baseUrl) missing.push("EVOLUTION_API_URL");
      console.error(`Function: Missing required fields in decrypted_credentials for ${integrationId}: ${missing.join(', ')}`);
      throw new Error(`Incomplete credentials configuration in database (${missing.join(' and ')} missing).`);
    }

    // 6. Prepare and return the response
    const responsePayload: ResponsePayload = {
      apiKey: apiKey,
      baseUrl: baseUrl.replace(/\/$/, ''), // Clean trailing slash
    };

    console.log(`Function: Successfully retrieved credentials for ${integrationId}.`);
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function: Error processing get-evolution-credentials request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      // Use 404 if error indicates "not found", otherwise 500
      status: error.message.includes("not found") ? 404 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
