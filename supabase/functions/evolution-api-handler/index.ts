import { serve } from "std/http/server.ts"; // Revert back to import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { fetchIntegrationCredentialsById } from "../_shared/integrationUtils.ts";

// Define interfaces for API responses and DB data
interface EvolutionFetchInstance {
  id: string; // This is the instance_id from Evolution API
  name: string; // This is the instanceName assigned by Evolution API
  connectionStatus: string;
  ownerJid: string | null;
  token: string;
  // Add other relevant fields if needed
}

interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string; // Name returned immediately after creation attempt
    instanceId: string; // The crucial unique ID
    status: string;
    // Add other relevant fields if needed
  };
  hash: string; // Assuming this is the token
}

interface IntegrationConfigUpsertData {
  integration_id: string;
  status?: string | null;
  owner_id?: string | null;
  instance_display_name?: string | null; // Name user intended/sees
  token?: string | null;
  user_reference_id?: string | null;
  instance_id?: string | null; // The unique ID from Evolution API
}


// Main function handler
serve(async (req: Request) => { // Add Request type
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for evolution-api-handler');
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createSupabaseServiceRoleClient();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Assumes URL path like /functions/v1/evolution-api-handler/action
  const actionFromPath = pathParts[3]; // Get the action part from the path

  console.log(`Processing evolution-api-handler request... Path action: ${actionFromPath}`);

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

  // Determine action: prioritize body, fallback to path
  const actionFromBody = (body as { action?: string })?.action;
  const action = actionFromBody || actionFromPath; // Use action from body if present

  console.log(`Determined action: ${action} (from body: ${!!actionFromBody}, from path: ${!!actionFromPath})`);


  try {
    // --- Route based on action ---

    // Action: List configured integration instances from DB and fetch LIVE status
    if (action === 'list-instances') {
      // ... (Keep existing list-instances logic as it seems correct) ...
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
      // ... (Keep existing send-text logic as it seems correct) ...
       console.log('Action: send-text - Entering block.'); // <-- ADDED LOG
      // Expect instanceId (DB ID) in the request body to fetch credentials
      const { instanceId, number, text } = body as { instanceId?: string; number?: string; text?: string };

      if (!instanceId || !number || !text) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: instanceId (DB ID), number, or text' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      console.log(`Action: send-text - Attempting to fetch credentials for instanceId: ${instanceId}`);
      console.log(`Action: send-text - Querying Supabase for instance details...`); // <-- ADDED LOG
      // Fetch credentials and display name by joining integrations and integrations_config
      const { data: instanceData, error: instanceError } = await supabaseClient
        .from('integrations')
        .select(`
          api_key,
          base_url,
          integrations_config ( instance_display_name )
        `)
        .eq('id', instanceId)
        .single();

      // Extract nested data and check for existence
      const rawIntegrationsConfig = instanceData?.integrations_config;
      let configFirstElement: { instance_display_name: string } | undefined = undefined;

      if (rawIntegrationsConfig) {
        if (Array.isArray(rawIntegrationsConfig) && rawIntegrationsConfig.length > 0) {
          configFirstElement = rawIntegrationsConfig[0] as { instance_display_name: string };
        } else if (typeof rawIntegrationsConfig === 'object' && !Array.isArray(rawIntegrationsConfig) && rawIntegrationsConfig !== null) {
          // If it's an object and not an array (and not null), treat it as the element.
          configFirstElement = rawIntegrationsConfig as { instance_display_name: string };
        }
      }
      const instanceNameForApi = configFirstElement?.instance_display_name;
      const apiKey = instanceData?.api_key;
      const baseUrl = instanceData?.base_url;

      // ---- START DEBUG LOGS (adjusted) ----
      console.log(`Action: send-text - DEBUG: Raw instanceData for ID ${instanceId}:`, JSON.stringify(instanceData, null, 2));
      console.log(`Action: send-text - DEBUG: Extracted apiKey: "${apiKey}" (Type: ${typeof apiKey})`);
      console.log(`Action: send-text - DEBUG: Extracted baseUrl: "${baseUrl}" (Type: ${typeof baseUrl})`);
      console.log(`Action: send-text - DEBUG: Raw value of instanceData.integrations_config:`, JSON.stringify(rawIntegrationsConfig, null, 2));
      console.log(`Action: send-text - DEBUG: Processed configFirstElement:`, JSON.stringify(configFirstElement, null, 2));
      console.log(`Action: send-text - DEBUG: Extracted instanceNameForApi: "${instanceNameForApi}" (Type: ${typeof instanceNameForApi})`);
      // ---- END DEBUG LOGS ----

      if (instanceError || !instanceData || !apiKey || !baseUrl || !instanceNameForApi) {
         const errorMsg = instanceError?.message || "Instance not found or missing required fields (instance_display_name from config, api_key, base_url).";
         // Log the specific reason for failure
         if (instanceError) console.error(`Action: send-text - Supabase query error for ID ${instanceId}:`, instanceError);
         if (!instanceData) console.error(`Action: send-text - No instanceData found for ID ${instanceId}.`);
         if (!apiKey) console.error(`Action: send-text - Missing apiKey for ID ${instanceId}.`);
         if (!baseUrl) console.error(`Action: send-text - Missing baseUrl for ID ${instanceId}.`);
         if (!instanceNameForApi) console.error(`Action: send-text - Missing instance_display_name (from config) for ID ${instanceId}.`);

         console.error(`Action: send-text - Overall failure fetching credentials for ID ${instanceId}: ${errorMsg}`); // Keep overall summary
         return new Response(JSON.stringify({ error: `Failed to get instance details: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: instanceError?.code === 'PGRST116' ? 404 : 500 // Use 404 if not found
        });
      }

      console.log(`Action: send-text - Successfully fetched credentials for instance ID ${instanceId}. Name: ${instanceNameForApi}`); // <-- ADDED LOG
      // Now we have the correct instanceNameForApi, apiKey, and baseUrl
      // Format the recipient number for the Evolution API
      const recipientNumber = number.includes('@') ? number : `${number}@c.us`;
      console.log(`Sending message to ${recipientNumber} via instance name "${instanceNameForApi}" (ID: ${instanceId}) using ${baseUrl}`);

      // --- Actual Evolution API Call ---
      const evolutionApiUrl = `${baseUrl}/message/sendText/${instanceNameForApi}`; // Use the correct name here
      console.log(`Action: send-text - Preparing to call Evolution API: ${evolutionApiUrl}`); // <-- ADDED LOG
      try {
        const response = await fetch(evolutionApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          // Simplified body structure matching common Evolution API usage for sendText
          body: JSON.stringify({
             number: recipientNumber, // Use the formatted recipient number
             text: text
             // Removed options object for simplicity, add back if needed and supported
           })
        });
        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
           let errorBody = `(Failed to read error response body)`;
           try {
               errorBody = await response.text(); // Get raw text for non-JSON errors or details
           } catch (_) { /* Ignore read error */ }
           console.error(`Evolution API error response (Status: ${response.status}):`, errorBody);
           throw new Error(`Evolution API error (${response.status}): ${errorBody}`);
        }

        // Attempt to parse JSON only if response is OK and likely JSON
        let result = {}; // Default result if no body or not JSON
        const contentType = response.headers.get('content-type');
        if (response.body && contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            console.log(`Evolution API response was not JSON (Status: ${response.status}, Content-Type: ${contentType})`);
            // Handle non-JSON success response if necessary, otherwise empty object is fine
        }

        if (!response.ok) {
          // Log the detailed error from the API if available
          console.error(`Evolution API error response (Status: ${response.status}):`, result);
          throw new Error(`Evolution API error (${response.status}): ${JSON.stringify(result)}`);
        }

        console.log(`Evolution API sendText response for instance name "${instanceNameForApi}":`, result);
        return new Response(JSON.stringify({ success: true, message: 'Message sent successfully via Evolution API', data: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
      } catch (apiError) {
        // Ensure the caught error object is logged thoroughly
        console.error(`Action: send-text - Evolution API call failed (Name: "${instanceNameForApi}", ID: ${instanceId}). Error:`, apiError); // <-- Enhanced Log
        // Log the error message specifically if it's an Error instance
        if (apiError instanceof Error) {
            console.error(`Action: send-text - API Error Message: ${apiError.message}`);
            console.error(`Action: send-text - API Error Stack: ${apiError.stack}`); // <-- ADDED THIS LINE
        }
        return new Response(JSON.stringify({ error: `Evolution API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}` }), { // Ensure message is string
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 // Bad Gateway indicates upstream issue
        });
      }
      // --- End Actual API Call ---
    }

    // Action: Get Instance Status from Evolution API
    else if (action === 'get-status') {
      // ... (Keep existing get-status logic) ...
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
      // ... (Keep existing connect-instance logic) ...
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

    // Action: Sync Instance Config (Fetch/Create & Store in DB)
    else if (action === 'sync-instance-config') {
      console.log('Action: sync-instance-config');
      // Extract integrationId and optional instanceName from the body
      const { integrationId, instanceName: instanceNameFromBody } = body as { integrationId?: string; instanceName?: string };

      if (!integrationId) {
        return new Response(JSON.stringify({ error: 'Missing required parameter: integrationId in body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // 1. Fetch integration details (global API key, base URL, instance name)
      console.log(`Fetching integration details for ID: ${integrationId}`);
      const { data: integrationData, error: integrationError } = await supabaseClient
        .from('integrations')
        .select('api_key, base_url, name') // Assuming api_key here is the GLOBAL key
        .eq('id', integrationId)
        .single();

      if (integrationError || !integrationData || !integrationData.api_key || !integrationData.base_url || !integrationData.name) {
        const errorMsg = integrationError?.message || "Integration not found or missing required fields (api_key, base_url, name).";
        console.error(`Failed to get integration details for ID ${integrationId}: ${errorMsg}`);
        return new Response(JSON.stringify({ error: `Failed to get integration details: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: integrationError?.code === 'PGRST116' ? 404 : 500
        });
      }

      const { api_key: globalApiKey, base_url: baseUrl, name: defaultInstanceNameFromDb } = integrationData;
      console.log(`Integration details fetched for default name "${defaultInstanceNameFromDb}" (ID: ${integrationId}). Base URL: ${baseUrl}`);

      // --- Start Refined Logic ---
      const fetchUrl = `${baseUrl}/instance/fetchInstances`;
      let finalInstanceData: EvolutionFetchInstance | null = null; // Will hold the data to upsert

      try {
        // Function to fetch all instances
        const fetchAllInstances = async (): Promise<EvolutionFetchInstance[]> => {
          console.log(`Fetching instances from Evolution API: ${fetchUrl}`);
          const response = await fetch(fetchUrl, { method: 'GET', headers: { 'apikey': globalApiKey } });
          if (!response.ok) {
            let errorBody = `(Failed to read error response body)`;
            try { errorBody = await response.text(); } catch (_) { /* Ignore */ }
            throw new Error(`Evolution API fetchInstances error (${response.status}): ${errorBody}`);
          }
          const instances = await response.json();
          console.log(`Successfully fetched ${instances?.length || 0} instances from API.`);
          return instances;
        };

        // Initial fetch
        let currentInstances = await fetchAllInstances();

        // --- Determine Flow: Create or Sync ---
        if (instanceNameFromBody) {
          // --- CREATE Flow ---
          console.log(`CREATE flow initiated for name: "${instanceNameFromBody}"`);
          const existingInstance = currentInstances.find(inst => inst.name === instanceNameFromBody);

          if (existingInstance) {
            // Instance with the desired creation name already exists. Use it.
            console.warn(`Instance named "${instanceNameFromBody}" already exists on provider. Using existing instance data.`);
            finalInstanceData = existingInstance;
          } else {
            // Instance does not exist, proceed with creation attempt
            console.log(`Creating instance with name: "${instanceNameFromBody}"...`);
            const createUrl = `${baseUrl}/instance/create`;
            const createResponse = await fetch(createUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': globalApiKey },
              body: JSON.stringify({ instanceName: instanceNameFromBody, integration: "WHATSAPP-BAILEYS" })
            });

            if (!createResponse.ok) {
              let errorBody = `(Failed to read error response body)`;
              try { errorBody = await createResponse.text(); } catch (_) { /* Ignore */ }
              throw new Error(`Evolution API create instance error (${createResponse.status}): ${errorBody}`);
            }
            const creationResult = await createResponse.json() as EvolutionCreateInstanceResponse;
            console.log(`Successfully initiated creation via API for: "${creationResult?.instance?.instanceName}"`);

            // IMPORTANT: Re-fetch after creation to get the definitive state
            console.log(`Re-fetching instances after creation attempt...`);
            currentInstances = await fetchAllInstances(); // Re-fetch the list
            finalInstanceData = currentInstances.find(inst => inst.name === instanceNameFromBody) || null;

            if (!finalInstanceData) {
              console.error(`Failed to find instance "${instanceNameFromBody}" after successful creation call.`);
              throw new Error(`Instance "${instanceNameFromBody}" was reported as created but could not be found immediately after.`);
            }
            console.log(`Successfully re-fetched created instance data for "${finalInstanceData.name}" (ID: ${finalInstanceData.id})`);
          }
        } else {
          // --- SYNC Flow ---
          console.log(`SYNC flow initiated for default name: "${defaultInstanceNameFromDb}"`);
          const foundInstance = currentInstances.find(inst => inst.name === defaultInstanceNameFromDb);

          if (foundInstance) {
            // Instance found matching default name, use its data
            finalInstanceData = foundInstance;
            console.log(`Sync: Found matching instance "${finalInstanceData.name}".`);
          } else {
            // Instance not found matching default name, clear local config
            console.log(`Sync: Instance "${defaultInstanceNameFromDb}" not found on provider. Clearing local config.`);
            const { error: updateError } = await supabaseClient
              .from('integrations_config')
              .update({
                instance_id: null, token: null, status: 'disconnected',
                instance_display_name: null, owner_id: null, user_reference_id: null
              })
              .eq('integration_id', integrationId);

            if (updateError) {
              console.error(`Sync: Failed to clear local config for integration ID ${integrationId}:`, updateError);
              throw new Error(`Instance not found on provider, and failed to clear local config: ${updateError.message}`);
            }
            // Return success, indicating sync completed and config cleared
            return new Response(JSON.stringify({ success: true, message: `Sync: Instance "${defaultInstanceNameFromDb}" not found on provider. Local config cleared.`, data: null }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
          }
        } // End of SYNC flow else

      } catch (apiError) {
        // Use the name that was attempted (either default or from body) in the error message
        const nameAttempted = instanceNameFromBody || defaultInstanceNameFromDb;
        console.error(`Evolution API call failed during sync (Fetch/Create for "${nameAttempted}", ID: ${integrationId}):`, apiError);
        return new Response(JSON.stringify({ error: `Evolution API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502
        });
      }

      // 5. Map data and prepare for DB upsert (Only if finalInstanceData is not null)
      if (!finalInstanceData) {
         // This should only happen if creation succeeded but re-fetch failed, which is handled in the catch block now.
         console.error("Error: finalInstanceData is null before mapping. This indicates an unexpected state.");
         return new Response(JSON.stringify({ error: 'Internal processing error: Failed to determine instance data for upsert.' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
         });
      }

      console.log(`Mapping data for instance: "${finalInstanceData.name}" (ID: ${finalInstanceData.id})`);
      // Prepare data for upsert. Use the user's requested name for display if it was provided (CREATE flow).
      const configToUpsert: IntegrationConfigUpsertData = {
        integration_id: integrationId,
        status: finalInstanceData.connectionStatus,
        owner_id: finalInstanceData.ownerJid,
        instance_display_name: instanceNameFromBody || finalInstanceData.name, // Prioritize user input name for display
        token: finalInstanceData.token,
        user_reference_id: finalInstanceData.ownerJid,
        instance_id: finalInstanceData.id // Use the actual ID from the provider
      };

      // Remove null/undefined values before upserting
      Object.keys(configToUpsert).forEach(keyStr => {
         const key = keyStr as keyof IntegrationConfigUpsertData; // Type assertion
         if (configToUpsert[key] === undefined || configToUpsert[key] === null) {
           // delete configToUpsert[key]; // Keep nulls for now, assuming DB handles them
         }
       });

      console.log('Final data prepared for upsert:', JSON.stringify(configToUpsert, null, 2));

      // 6. Upsert into integrations_config
      const { error: upsertError } = await supabaseClient
        .from('integrations_config')
        .upsert(configToUpsert, { onConflict: 'integration_id' });

      if (upsertError) {
        console.error(`Failed to upsert integration config for integration ID ${integrationId}:`, upsertError);
        return new Response(JSON.stringify({ error: `Database error saving instance config: ${upsertError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }

      console.log(`Successfully synced and saved config for integration ID ${integrationId} (Instance: ${configToUpsert.instance_display_name})`);
      // 7. Return success
      return new Response(JSON.stringify({ success: true, message: `Instance config synced successfully for ${configToUpsert.instance_display_name}`, data: configToUpsert }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
      // --- End Refined Logic ---

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
