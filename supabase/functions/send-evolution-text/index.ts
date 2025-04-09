import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Import SupabaseClient type
import { corsHeaders } from '../_shared/cors.ts';

// Define the expected request body structure from the frontend
interface RequestPayload {
  instance: string;
  integrationId: string;
  number: string;
  text: string;
  // Optional parameters
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: {
    key: { id: string };
    message: { conversation: string };
  };
}

// Define the structure for Evolution API credentials
interface EvolutionCredentials {
  apiKey: string;
  baseUrl: string;
}

// Define the structure for the Evolution API payload
interface EvolutionPayload {
    number: string;
    text: string;
    options?: {
        delay?: number;
        linkPreview?: boolean;
        mentions?: {
            everyOne?: boolean;
            mentioned?: string[];
        };
        quoted?: {
            key: { id: string };
            message: { conversation: string };
        };
    };
}


// Function to fetch Evolution credentials from Supabase
async function getEvolutionCredentials(supabaseClient: SupabaseClient, integrationId: string): Promise<EvolutionCredentials> { // Use SupabaseClient type
  console.log(`Function: Fetching credentials for integration ID: ${integrationId}`);
  const { data, error } = await supabaseClient
    .from('integrations')
    .select('decrypted_credentials') // Select the column containing decrypted credentials
    .eq('id', integrationId)
    .single();

  if (error) {
    console.error(`Function: Error fetching integration ${integrationId}:`, error);
    throw new Error(`Supabase error fetching integration: ${error.message}`);
  }

  if (!data || !data.decrypted_credentials) {
    console.error(`Function: No credentials found for integration ${integrationId}`);
    throw new Error('Credentials not found for this integration.');
  }

  const credentials = data.decrypted_credentials;
  console.log(`Function: Credentials fetched successfully for ${integrationId}. Base URL: ${credentials.EVOLUTION_API_URL}`); // Log base URL for confirmation

  // Validate required credentials
  if (!credentials.EVOLUTION_API_KEY || !credentials.EVOLUTION_API_URL) {
      console.error(`Function: Missing API Key or Base URL for integration ${integrationId}`);
      throw new Error('Incomplete credentials configuration (missing API Key or Base URL).');
  }


  return {
    apiKey: credentials.EVOLUTION_API_KEY,
    baseUrl: credentials.EVOLUTION_API_URL.replace(/\/$/, ''), // Remove trailing slash if present
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure Authorization header is present
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Create Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse the request body
    const {
        instance,
        integrationId,
        number,
        text,
        ...optionalData
    }: RequestPayload = await req.json();

    if (!instance || !integrationId || !number || !text) {
        return new Response(JSON.stringify({ error: 'Missing required fields: instance, integrationId, number, text' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Function: Received send text request for instance ${instance}, integration ${integrationId}, number ${number}`);

    // Fetch Evolution API credentials using the service role key for security
     const supabaseAdminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    const { apiKey, baseUrl } = await getEvolutionCredentials(supabaseAdminClient, integrationId);

    // Construct the Evolution API URL
    const apiUrl = `${baseUrl}/message/sendText/${instance}`;
    console.log(`Function: Calling Evolution API: ${apiUrl}`);

    // Construct the payload for Evolution API
    const evolutionPayload: EvolutionPayload = {
        number,
        text,
        // Construct options object only if optional params exist
        ...(Object.keys(optionalData).length > 0 && {
            options: {
                ...(optionalData.delay !== undefined && { delay: optionalData.delay }),
                ...(optionalData.linkPreview !== undefined && { linkPreview: optionalData.linkPreview }),
                // Construct mentions object only if needed
                ...((optionalData.mentionsEveryOne || optionalData.mentioned) && {
                    mentions: {
                        ...(optionalData.mentionsEveryOne && { everyOne: true }),
                        ...(optionalData.mentioned && { mentioned: optionalData.mentioned }),
                    }
                }),
                ...(optionalData.quoted && { quoted: optionalData.quoted }),
            }
        })
    };

    // Remove options if it's empty after construction
    if (evolutionPayload.options && Object.keys(evolutionPayload.options).length === 0) {
        delete evolutionPayload.options;
    }

    console.log("Function: Sending payload:", JSON.stringify(evolutionPayload, null, 2));


    // Make the request to the Evolution API
    const evoResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(evolutionPayload),
    });

    // Handle Evolution API response
    const responseBody = await evoResponse.text(); // Read body once

    if (!evoResponse.ok) {
      console.error(`Function: Evolution API error (${evoResponse.status}): ${responseBody}`);
       // Try to parse error details if JSON
       let details = responseBody;
       try {
         const jsonError = JSON.parse(responseBody);
         details = jsonError.message || jsonError.error || details;
       } catch (e) { /* Ignore parsing error */ }
      return new Response(JSON.stringify({ error: `Evolution API Error (${evoResponse.status}): ${details}` }), {
        status: evoResponse.status, // Forward the status code
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Function: Evolution API call successful for instance ${instance}. Status: ${evoResponse.status}`);
    // Return the successful response from Evolution API
    // Ensure response is valid JSON before parsing
    let resultData;
    try {
        resultData = JSON.parse(responseBody);
    } catch (e) {
        console.error("Function: Failed to parse Evolution API success response as JSON:", responseBody);
        return new Response(JSON.stringify({ error: 'Failed to parse Evolution API response' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
    }

    return new Response(JSON.stringify(resultData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function: Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
