import { serve } from "std/http/server.ts"; // Use import map
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { fetchIntegrationCredentialsById } from "../_shared/integrationUtils.ts";

// Main function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for evolution-api-handler');
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createSupabaseServiceRoleClient();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Assumes URL path like /functions/v1/evolution-api-handler/action
  const action = pathParts[3]; // Get the action part of the path

  console.log(`Processing evolution-api-handler request for action: ${action}`);

  let body = {};
  try {
    if (req.body && req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }

  try {
    // --- Route based on action ---

    // Action: List configured integration instances from DB and fetch LIVE status
    if (action === 'list-instances') {
      console.log('Action: list-instances - Fetching from DB and live status from API');

      // 1. Fetch basic instance data from DB
      const { data: dbInstances, error: dbError } = await supabaseClient
        .from('integrations') // Assuming 'integrations' table holds instance info
        .select('id, name, provider, created_at, base_url, connection_status'); // Include stored status as fallback

      if (dbError) {
        console.error('Error fetching integration instances from DB:', dbError);
        return new Response(JSON.stringify({ error: `Failed to fetch integration instances from DB: ${dbError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }

      if (!dbInstances || dbInstances.length === 0) {
          console.log('No integration instances found in DB.');
          return new Response(JSON.stringify({ instances: [] }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
          });
      }

      // 2. Fetch live status for each instance
      const instancesWithLiveStatus = await Promise.all(dbInstances.map(async (instance) => {
        // Fetch credentials for the instance using its DB ID
        const { credentials, error: credError } = await fetchIntegrationCredentialsById(supabaseClient, instance.id);

        let liveStatus = 'error_fetching_status'; // Default status if API call fails or creds missing
        let statusMessage = `Failed to get credentials: ${credError || 'API key or Base URL missing'}`;

        // Use instance.name for the API call if credentials exist
        if (!credError && credentials?.apiKey && credentials.baseUrl && instance.name) {
          const { apiKey, baseUrl } = credentials;
          const instanceNameForApi = instance.name; // Use the name field for the API call
          console.log(`Fetching live status for instance name "${instanceNameForApi}" (ID: ${instance.id}) from ${baseUrl}`);

          // --- Placeholder for Evolution API Call to get status ---
          // Use instanceNameForApi in the URL path
          const evolutionApiUrl = `${baseUrl}/instance/connectionState/${instanceNameForApi}`;
          try {
            const response = await fetch(evolutionApiUrl, {
              method: 'GET',
              headers: { 'apikey': apiKey }
            });
            const result = await response.json();
            if (!response.ok) {
               throw new Error(`Evolution API error (${response.status}): ${JSON.stringify(result)}`);
            }
            liveStatus = result?.state || 'unknown_api_response'; // Extract state from API response
            statusMessage = `Successfully fetched live status: ${liveStatus}`;
            console.log(`Live status for instance name "${instanceNameForApi}" (ID: ${instance.id}): ${liveStatus}`);
          } catch (apiError) {
            console.error(`Evolution API call failed for get-status (Name: "${instanceNameForApi}", ID: ${instance.id}):`, apiError);
            statusMessage = `Evolution API call failed: ${apiError.message}`;
            // Keep liveStatus as 'error_fetching_status'
          }
          // --- End Placeholder ---
        } else {
             console.error(`Skipping live status fetch for instance ID ${instance.id} due to credential error or missing name: ${statusMessage}`);
        }

        // 3. Combine DB data with live status
        return {
          ...instance, // Include all original DB fields
          live_connection_status: liveStatus, // Add the live status
          status_fetch_message: statusMessage, // Add info about the fetch attempt
          // Optionally keep the stored status for comparison/fallback
          // stored_connection_status: instance.connection_status
        };
      }));

      // 4. Return combined data
      return new Response(JSON.stringify({ instances: instancesWithLiveStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Action: Send Text Message via Evolution API
    else if (action === 'send-text') {
      console.log('Action: send-text');
      // Expect instanceId (DB ID) in the request body to fetch credentials
      const { instanceId, number, text } = body as { instanceId?: string; number?: string; text?: string };

      if (!instanceId || !number || !text) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: instanceId (DB ID), number, or text' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // Fetch credentials AND name using the instanceId (DB ID)
      const { data: instanceData, error: instanceError } = await supabaseClient
        .from('integrations')
        .select('name, api_key, base_url') // Fetch name along with credentials
        .eq('id', instanceId)
        .single();

      if (instanceError || !instanceData || !instanceData.api_key || !instanceData.base_url || !instanceData.name) {
        const errorMsg = instanceError?.message || "Instance not found or missing required fields (name, api_key, base_url).";
        console.error(`Failed to get instance data/credentials for ID ${instanceId}: ${errorMsg}`);
        return new Response(JSON.stringify({ error: `Failed to get instance details: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: instanceError?.code === 'PGRST116' ? 404 : 500 // Use 404 if not found
        });
      }

      const { name: instanceNameForApi, api_key: apiKey, base_url: baseUrl } = instanceData;
      console.log(`Sending message to ${number} via instance name "${instanceNameForApi}" (ID: ${instanceId}) using ${baseUrl}`);

      // --- Placeholder for Evolution API Call ---
      // Use instanceNameForApi in the URL path
      // const evolutionApiUrl = `${baseUrl}/message/sendText/${instanceNameForApi}`;
      // try {
      //   const response = await fetch(evolutionApiUrl, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'apikey': apiKey
      //     },
      //     body: JSON.stringify({ number, options: { delay: 1200, presence: 'composing' }, textMessage: { text } })
      //   });
      //   const result = await response.json();
      //   if (!response.ok) {
      //     throw new Error(`Evolution API error (${response.status}): ${JSON.stringify(result)}`);
      //   }
      //   console.log(`Evolution API sendText response for instance name "${instanceNameForApi}":`, result);
      //   return new Response(JSON.stringify({ success: true, message: 'Message sent successfully via Evolution API', data: result }), {
      //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      //   });
      // } catch (apiError) {
      //   console.error(`Evolution API call failed for send-text (Name: "${instanceNameForApi}", ID: ${instanceId}):`, apiError);
      //   return new Response(JSON.stringify({ error: `Evolution API call failed: ${apiError.message}` }), {
      //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 // Bad Gateway
      //   });
      // }
      // --- End Placeholder ---

      // Return simulated success for now
      return new Response(JSON.stringify({ success: true, message: 'Message sending simulation successful', messageId: `simulated_${Date.now()}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });

    }

    // Action: Get Instance Status from Evolution API
    else if (action === 'get-status') {
        console.log('Action: get-status');
        // Allow instanceId (DB ID) from query param or body
        const instanceId = url.searchParams.get('instanceId') || (body as { instanceId?: string }).instanceId;

        if (!instanceId) {
            return new Response(JSON.stringify({ error: 'Missing required parameter: instanceId (DB ID in query string or body)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // Fetch credentials AND name using the instanceId (DB ID)
        const { data: instanceData, error: instanceError } = await supabaseClient
          .from('integrations')
          .select('name, api_key, base_url') // Fetch name along with credentials
          .eq('id', instanceId)
          .single();

        if (instanceError || !instanceData || !instanceData.api_key || !instanceData.base_url || !instanceData.name) {
            const errorMsg = instanceError?.message || "Instance not found or missing required fields (name, api_key, base_url).";
            console.error(`Failed to get instance data/credentials for ID ${instanceId}: ${errorMsg}`);
            return new Response(JSON.stringify({ error: `Failed to get instance details: ${errorMsg}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: instanceError?.code === 'PGRST116' ? 404 : 500 // Use 404 if not found
            });
        }

        const { name: instanceNameForApi, api_key: apiKey, base_url: baseUrl } = instanceData;
        console.log(`Checking status for instance name "${instanceNameForApi}" (ID: ${instanceId}) using ${baseUrl}`);

        // --- Placeholder for Evolution API Call ---
        // Use instanceNameForApi in the URL path
        // const evolutionApiUrl = `${baseUrl}/instance/connectionState/${instanceNameForApi}`;
        // try {
        //   const response = await fetch(evolutionApiUrl, {
        //     method: 'GET',
        //     headers: { 'apikey': apiKey }
        //   });
        //   const result = await response.json();
        //   if (!response.ok) {
        //      throw new Error(`Evolution API error (${response.status}): ${JSON.stringify(result)}`);
        //   }
        //   console.log(`Evolution API get-status response for instance name "${instanceNameForApi}":`, result);
        //   return new Response(JSON.stringify({ success: true, message: 'Status fetched successfully', data: result }), {
        //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        //   });
        // } catch (apiError) {
        //   console.error(`Evolution API call failed for get-status (Name: "${instanceNameForApi}", ID: ${instanceId}):`, apiError);
        //   return new Response(JSON.stringify({ error: `Evolution API call failed: ${apiError.message}` }), {
        //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 // Bad Gateway
        //   });
        // }
        // --- End Placeholder ---

        // Return simulated success for now
        return new Response(JSON.stringify({ success: true, status: 'simulated_connected', message: 'Status check simulation successful' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    }

    // Action: Connect Instance and get QR Code
    else if (action === 'connect-instance') {
        console.log('Action: connect-instance');
        // Allow instanceId (DB ID) from query param or body
        const instanceId = url.searchParams.get('instanceId') || (body as { instanceId?: string }).instanceId;

        if (!instanceId) {
            return new Response(JSON.stringify({ error: 'Missing required parameter: instanceId (DB ID in query string or body)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // Fetch credentials AND name using the instanceId (DB ID)
         const { data: instanceData, error: instanceError } = await supabaseClient
          .from('integrations')
          .select('name, api_key, base_url') // Fetch name along with credentials
          .eq('id', instanceId)
          .single();

        if (instanceError || !instanceData || !instanceData.api_key || !instanceData.base_url || !instanceData.name) {
            const errorMsg = instanceError?.message || "Instance not found or missing required fields (name, api_key, base_url).";
            console.error(`Failed to get instance data/credentials for ID ${instanceId}: ${errorMsg}`);
            return new Response(JSON.stringify({ error: `Failed to get instance details: ${errorMsg}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: instanceError?.code === 'PGRST116' ? 404 : 500 // Use 404 if not found
            });
        }

        const { name: instanceNameForApi, api_key: apiKey, base_url: baseUrl } = instanceData;
        console.log(`Attempting to connect instance name "${instanceNameForApi}" (ID: ${instanceId}) using ${baseUrl} to get QR code.`);

        // --- Placeholder for Evolution API Call to get QR Code ---
        // Use instanceNameForApi in the URL path
        // const evolutionApiUrl = `${baseUrl}/instance/connect/${instanceNameForApi}`; // Or potentially /instance/qr/{instanceNameForApi}
        // try {
        //   // Adjust fetch method (GET or POST) and body based on Evolution API docs for connect/QR
        //   const response = await fetch(evolutionApiUrl, {
        //     method: 'GET', // Or 'POST' if required
        //     headers: { 'apikey': apiKey }
        //     // body: JSON.stringify({ webhook: 'your-webhook-url' }) // Optional: if connect requires webhook URL
        //   });
        //   const result = await response.json(); // Expects { base64: "QR_CODE_BASE64_STRING", ... } or similar
        //   if (!response.ok || !result.base64) { // Check for successful response and QR data
        //      throw new Error(`Evolution API error (${response.status}) or missing QR data: ${JSON.stringify(result)}`);
        //   }
        //   console.log(`Evolution API connect-instance response for instance name "${instanceNameForApi}":`, result);
        //   // Return only the necessary data (e.g., the base64 QR string)
        //   return new Response(JSON.stringify({ success: true, qrCodeBase64: result.base64 }), {
        //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        //   });
        // } catch (apiError) {
        //   console.error(`Evolution API call failed for connect-instance (Name: "${instanceNameForApi}", ID: ${instanceId}):`, apiError);
        //   return new Response(JSON.stringify({ error: `Evolution API call failed: ${apiError.message}` }), {
        //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 // Bad Gateway
        //   });
        // }
        // --- End Placeholder ---

        // Return simulated success with placeholder QR data for now
        return new Response(JSON.stringify({
            success: true,
            qrCodeBase64: 'SIMULATED_QR_CODE_BASE64_PLACEHOLDER', // Replace with actual data when API call is implemented
            message: 'Connect instance simulation successful'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    }

    // Handle unknown actions
    else {
      console.log(`Unknown action requested: ${action}`);
      return new Response(JSON.stringify({ error: 'Not found', message: `Unknown action: ${action}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

  } catch (error) {
    console.error('Unhandled error in evolution-api-handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
