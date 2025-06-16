import { serve } from "std/http/server.ts";
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
}

interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string; 
    status: string;
  };
  hash: string; 
}

interface IntegrationConfigUpsertData {
  integration_id: string;
  status?: string | null;
  owner_id?: string | null;
  instance_display_name?: string | null;
  token?: string | null;
  user_reference_id?: string | null;
  instance_id?: string | null;
}

interface ProviderResponse {
  success: boolean;
  provider_message_id?: string;
  error_message?: string;
}

async function _handleEvolutionApiCall(
  apiUrl: string,
  method: string,
  apiKey: string,
  body?: Record<string, unknown>
): Promise<ProviderResponse> {
  try {
    const response = await fetch(apiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let responseData: Record<string, unknown> = {};
    const contentType = response.headers.get('content-type');
    if (response.body && contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const textResponse = await response.text();
      console.log(`Evolution API response was not JSON (Status: ${response.status}, Content-Type: ${contentType}): ${textResponse}`);
      if (!response.ok) {
        return { success: false, error_message: `Evolution API error (${response.status}): ${textResponse || "Unknown error"}` };
      }
    }

    if (!response.ok) {
      console.error(`Evolution API error response (Status: ${response.status}):`, responseData);
      let extractedErrorMessage = "Unknown Evolution API error";
      if (responseData && typeof responseData.message === 'string') {
        extractedErrorMessage = responseData.message;
      } else if (responseData && typeof (responseData.error as Record<string, unknown>)?.message === 'string') {
        extractedErrorMessage = (responseData.error as Record<string, unknown>).message as string;
      } else if (Object.keys(responseData).length > 0) {
        extractedErrorMessage = JSON.stringify(responseData);
      }
      return { success: false, error_message: `Evolution API error (${response.status}): ${extractedErrorMessage}` };
    }
    
    let providerMessageId: string | undefined = undefined; // Changed from string | null
    if (responseData) {
        const keyAsRecord = responseData.key as Record<string, unknown> | undefined;
        const idValue = String(keyAsRecord?.id || responseData.id || responseData.wuid || "");
        if (idValue !== "") {
            providerMessageId = idValue;
        }
    }
    console.log(`Evolution API success response for ${apiUrl}:`, responseData);
    return { success: true, provider_message_id: providerMessageId, error_message: undefined };

  } catch (error) {
    console.error(`Network or other error during Evolution API call to ${apiUrl}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error_message: message || "Network error or unexpected issue during API call." };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for evolution-api-handler');
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createSupabaseServiceRoleClient();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const actionFromPath = pathParts[3];

  console.log(`Processing evolution-api-handler request... Path action: ${actionFromPath}`);

  let bodyParsed: Record<string, unknown> = {};
  try {
    if (req.body && req.headers.get("content-type")?.includes("application/json")) {
      bodyParsed = await req.json();
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }

  const actionFromBody = (bodyParsed as { action?: string })?.action;
  const action = actionFromBody || actionFromPath;

  console.log(`Determined action: ${action} (from body: ${!!actionFromBody}, from path: ${!!actionFromPath})`);

  try {
    if (action === 'list-instances') {
       console.log('Action: list-instances - Fetching from DB and live status from API');
      const { data: dbInstances, error: dbError } = await supabaseClient
        .from('integrations') 
        .select('id, name, base_url'); 

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

      const instancesWithLiveStatus = await Promise.all(dbInstances.map(async (instance) => {
        const { data: configData } = await supabaseClient
          .from('integrations_config')
          .select('instance_display_name, status, owner_id')
          .eq('integration_id', instance.id)
          .single();

        const instanceNameForApi = configData?.instance_display_name || instance.name; 
        let liveStatus = 'error_fetching_status'; 
        let statusMessage = 'Could not fetch live status.';
        
        const { credentials, error: credError } = await fetchIntegrationCredentialsById(supabaseClient, instance.id);

        if (!credError && credentials?.apiKey && credentials.baseUrl) {
          const { apiKey, baseUrl } = credentials;
          console.log(`Fetching live status for instance name "${instanceNameForApi}" (Integration ID: ${instance.id}) from ${baseUrl}`);
          const evolutionApiUrl = `${baseUrl}/instance/connectionState/${instanceNameForApi}`;
          try {
            const evoResponse = await fetch(evolutionApiUrl, { method: 'GET', headers: { 'apikey': apiKey }});
            const result = await evoResponse.json();
            if (!evoResponse.ok) {
               throw new Error(`Evolution API error (${evoResponse.status}): ${JSON.stringify(result)}`);
            }
            liveStatus = result?.state || 'unknown_api_response';
            statusMessage = `Successfully fetched live status: ${liveStatus}`;
          } catch (apiError) {
            console.error(`Evolution API call failed for get-status (Name: "${instanceNameForApi}", ID: ${instance.id}):`, apiError);
            statusMessage = `Evolution API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
          }
        } else {
          statusMessage = `Failed to get credentials: ${credError?.message || 'API key or Base URL missing'}`;
          console.error(`Skipping live status fetch for instance ID ${instance.id}: ${statusMessage}`);
        }
        return {
          db_id: instance.id,
          integration_name: instance.name, 
          instance_display_name: configData?.instance_display_name || instance.name, 
          owner_id: configData?.owner_id,
          stored_db_status: configData?.status,
          live_connection_status: liveStatus,
          status_fetch_message: statusMessage,
        };
      }));
      return new Response(JSON.stringify({ instances: instancesWithLiveStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    else if (action === 'sendText') {
      console.log("evolution-api-handler: 'sendText' action received. Body parsed:", JSON.stringify(bodyParsed, null, 2)); // Added logging
      const { integrationConfigId, number, text } = bodyParsed as { integrationConfigId?: string; number?: string; text?: string };

      if (!integrationConfigId || !number || !text) {
        console.error("evolution-api-handler: 'send-text' missing parameters. integrationConfigId:", integrationConfigId, "number:", number, "text:", text); // Added logging
        return new Response(JSON.stringify({ error: 'Missing required parameters: integrationConfigId, number, or text' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        });
      }
      
      const { data: config, error: configErr } = await supabaseClient
        .from('integrations_config')
        .select(`instance_id, instance_display_name, integration:integrations (api_key, base_url)`)
        .eq('id', integrationConfigId)
        .single();

      if (configErr || !config || !config.integration || !config.instance_display_name || !config.integration.api_key || !config.integration.base_url) {
        const errorMsg = configErr?.message || "Instance config not found or missing critical details (instance_display_name, api_key, base_url).";
        console.error(`Failed to get instance details for integration_config_id ${integrationConfigId}: ${errorMsg}`);
        return new Response(JSON.stringify({ error: `Configuration error: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
        });
      }

      const recipientNumber = number.includes('@') ? number : `${number}@c.us`;
      // Use instance_display_name (which is the Evolution API's instanceName) in the URL
      const evolutionApiUrl = `${config.integration.base_url}/message/sendText/${config.instance_display_name}`;
      const payload = { number: recipientNumber, text: text };
      
      console.log(`Action: send-text to ${recipientNumber} via instance name: ${config.instance_display_name} (DB instance_id: ${config.instance_id})`);
      const providerResponse = await _handleEvolutionApiCall(evolutionApiUrl, 'POST', config.integration.api_key, payload);

      return new Response(JSON.stringify(providerResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: providerResponse.success ? 200 : 502,
      });
    }
    else if (action === 'send-media') {
      console.log("evolution-api-handler: 'send-media' action received. Body parsed:", JSON.stringify(bodyParsed, null, 2)); // Added logging
      const { integrationConfigId, recipientJid, mediaData, mimeType, filename, caption } = bodyParsed as { 
        integrationConfigId?: string; recipientJid?: string; mediaData?: string; mimeType?: string; filename?: string; caption?: string; 
      };

      if (!integrationConfigId || !recipientJid || !mediaData || !mimeType || !filename) {
        console.error("evolution-api-handler: 'send-media' missing parameters. Check integrationConfigId, recipientJid, mediaData, mimeType, filename."); // Added logging
        return new Response(JSON.stringify({ error: 'Missing required parameters for send-media' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        });
      }

      const { data: config, error: configErr } = await supabaseClient
        .from('integrations_config')
        .select(`instance_id, integration:integrations (api_key, base_url)`)
        .eq('id', integrationConfigId)
        .single();

      if (configErr || !config || !config.integration || !config.instance_id || !config.integration.api_key || !config.integration.base_url) {
        const errorMsg = configErr?.message || "Instance config not found or missing critical details for media sending.";
        console.error(`Failed to get instance details for integration_config_id ${integrationConfigId} (send-media): ${errorMsg}`);
        return new Response(JSON.stringify({ error: `Configuration error: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
        });
      }
      
      const evolutionApiUrl = `${config.integration.base_url}/message/sendMedia/${config.instance_id}`;
      const determinedMediatype = mimeType.startsWith('image') ? 'image' 
                                : mimeType.startsWith('video') ? 'video' 
                                : mimeType.startsWith('audio') ? 'audio' 
                                : 'document';
      const mediaApiPayload = {
        number: recipientJid,
        mediatype: determinedMediatype,
        media: mediaData.startsWith('data:') ? mediaData.substring(mediaData.indexOf(',') + 1) : mediaData,
        mimetype: mimeType,
        fileName: filename,
        caption: caption || undefined,
      };
      
      console.log(`Action: send-media to ${recipientJid} via ${config.instance_id}`);
      const providerResponse = await _handleEvolutionApiCall(evolutionApiUrl, 'POST', config.integration.api_key, mediaApiPayload);
      
      return new Response(JSON.stringify(providerResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: providerResponse.success ? 200 : 502,
      });
    }
    else if (action === 'get-status') {
        console.log('Action: get-status');
        const instanceId = url.searchParams.get('instanceId') || (bodyParsed as { instanceId?: string }).instanceId; 
        if (!instanceId) {
            return new Response(JSON.stringify({ error: 'Missing required parameter: instanceId (DB ID)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
        const { data: configData, error: configErr } = await supabaseClient
            .from('integrations_config')
            .select('instance_id, integration:integrations(api_key, base_url)')
            .eq('integration_id', instanceId) 
            .single();

        if (configErr || !configData || !configData.integration || !configData.instance_id) {
            const errorMsg = configErr?.message || "Instance config not found or missing Evolution instance_id.";
            console.error(`Failed to get instance config for integration ID ${instanceId}: ${errorMsg}`);
            return new Response(JSON.stringify({ error: `Configuration error: ${errorMsg}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }
        const { instance_id: evolutionInstanceName, integration: { api_key: apiKey, base_url: baseUrl } } = configData;
        if (!apiKey || !baseUrl) {
             return new Response(JSON.stringify({ error: 'Missing API key or base URL for the integration.'}), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }
        console.log(`Checking status for Evolution instance "${evolutionInstanceName}" (Integration ID: ${instanceId}) using ${baseUrl}`);
        const evolutionApiUrl = `${baseUrl}/instance/connectionState/${evolutionInstanceName}`;
        const providerResponse = await _handleEvolutionApiCall(evolutionApiUrl, 'GET', apiKey);
        return new Response(JSON.stringify(providerResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: providerResponse.success ? 200 : 502 });
    }
    else if (action === 'connect-instance') {
        console.log('Action: connect-instance');
        const instanceId = url.searchParams.get('instanceId') || (bodyParsed as { instanceId?: string }).instanceId; 
         if (!instanceId) {
            return new Response(JSON.stringify({ error: 'Missing required parameter: instanceId (DB ID)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
        const { data: configData, error: configErr } = await supabaseClient
            .from('integrations_config')
            .select('instance_id, integration:integrations(api_key, base_url)')
            .eq('integration_id', instanceId)
            .single();
        if (configErr || !configData || !configData.integration || !configData.instance_id) {
            const errorMsg = configErr?.message || "Instance config not found or missing Evolution instance_id for connect.";
            console.error(`Failed to get instance config for integration ID ${instanceId} (connect): ${errorMsg}`);
            return new Response(JSON.stringify({ error: `Configuration error: ${errorMsg}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }
        const { instance_id: evolutionInstanceName, integration: { api_key: apiKey, base_url: baseUrl } } = configData;
        if (!apiKey || !baseUrl) {
             return new Response(JSON.stringify({ error: 'Missing API key or base URL for the integration.'}), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }
        console.log(`Attempting to connect Evolution instance "${evolutionInstanceName}" (Integration ID: ${instanceId}) to get QR code.`);
        const evolutionApiUrl = `${baseUrl}/instance/connect/${evolutionInstanceName}`;
        const providerResponse = await _handleEvolutionApiCall(evolutionApiUrl, 'GET', apiKey); 
         return new Response(JSON.stringify(providerResponse), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: providerResponse.success ? 200 : 502 });
    }
    else if (action === 'sync-instance-config') {
      console.log('Action: sync-instance-config');
      const { integrationId, instanceName: instanceNameFromBody } = bodyParsed as { integrationId?: string; instanceName?: string };
      if (!integrationId) {
        return new Response(JSON.stringify({ error: 'Missing required parameter: integrationId in body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
      const { data: integrationData, error: integrationError } = await supabaseClient
        .from('integrations')
        .select('api_key, base_url, name')
        .eq('id', integrationId)
        .single();
      if (integrationError || !integrationData || !integrationData.api_key || !integrationData.base_url || !integrationData.name) {
        const errorMsg = integrationError?.message || "Integration not found or missing required fields (api_key, base_url, name).";
        return new Response(JSON.stringify({ error: `Failed to get integration details: ${errorMsg}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: integrationError?.code === 'PGRST116' ? 404 : 500 });
      }
      const { api_key: globalApiKey, base_url: baseUrl, name: defaultInstanceNameFromDb } = integrationData;
      const fetchUrl = `${baseUrl}/instance/fetchInstances`;
      let finalInstanceData: EvolutionFetchInstance | null = null;
      try {
        const fetchAllInstances = async (): Promise<EvolutionFetchInstance[]> => {
          const response = await fetch(fetchUrl, { method: 'GET', headers: { 'apikey': globalApiKey } });
          if (!response.ok) {
            let errorBody = `(Failed to read error response body)`; try { errorBody = await response.text(); } catch (_) { /* Ignore */ }
            throw new Error(`Evolution API fetchInstances error (${response.status}): ${errorBody}`);
          }
          return await response.json();
        };
        let currentInstances = await fetchAllInstances();
        if (instanceNameFromBody) {
          const existingInstance = currentInstances.find(inst => inst.name === instanceNameFromBody);
          if (existingInstance) {
            finalInstanceData = existingInstance;
          } else {
            const createUrl = `${baseUrl}/instance/create`;
            const createResponse = await fetch(createUrl, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': globalApiKey },
              body: JSON.stringify({ instanceName: instanceNameFromBody, integration: "WHATSAPP-BAILEYS" })
            });
            if (!createResponse.ok) {
              let errorBody = `(Failed to read error response body)`; try { errorBody = await createResponse.text(); } catch (_) { /* Ignore */ }
              throw new Error(`Evolution API create instance error (${createResponse.status}): ${errorBody}`);
            }
            await createResponse.json(); 
            currentInstances = await fetchAllInstances();
            finalInstanceData = currentInstances.find(inst => inst.name === instanceNameFromBody) || null;
            if (!finalInstanceData) throw new Error(`Instance "${instanceNameFromBody}" not found after creation.`);
          }
        } else {
          finalInstanceData = currentInstances.find(inst => inst.name === defaultInstanceNameFromDb) || null;
          if (!finalInstanceData) {
            await supabaseClient.from('integrations_config').update({ instance_id: null, token: null, status: 'disconnected', instance_display_name: null, owner_id: null, user_reference_id: null }).eq('integration_id', integrationId);
            return new Response(JSON.stringify({ success: true, message: `Sync: Instance "${defaultInstanceNameFromDb}" not found. Local config cleared.`, data: null }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }
      } catch (apiError) {
        const nameAttempted = instanceNameFromBody || defaultInstanceNameFromDb;
        console.error(`Evolution API call failed during sync (Fetch/Create for "${nameAttempted}", ID: ${integrationId}):`, apiError);
        let errorMessageString: string;
        if (apiError instanceof Error) {
          errorMessageString = apiError.message;
        } else {
          errorMessageString = String(apiError);
        }
        return new Response(JSON.stringify({ error: `Evolution API call failed: ${errorMessageString}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 });
      }
      if (!finalInstanceData) {
         return new Response(JSON.stringify({ error: 'Internal processing error: Failed to determine instance data.' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }
      const configToUpsert: IntegrationConfigUpsertData = {
        integration_id: integrationId, status: finalInstanceData.connectionStatus, owner_id: finalInstanceData.ownerJid,
        instance_display_name: instanceNameFromBody || finalInstanceData.name, token: finalInstanceData.token,
        user_reference_id: finalInstanceData.ownerJid, instance_id: finalInstanceData.id
      };
      const { error: upsertError } = await supabaseClient.from('integrations_config').upsert(configToUpsert, { onConflict: 'integration_id' });
      if (upsertError) {
        return new Response(JSON.stringify({ error: `Database error saving instance config: ${upsertError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }
      return new Response(JSON.stringify({ success: true, message: `Instance config synced for ${configToUpsert.instance_display_name}`, data: configToUpsert }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
    else {
      console.log(`Unknown action requested: ${action}`);
      return new Response(JSON.stringify({ error: 'Not found', message: `Unknown action: ${action}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }
  } catch (error) {
    console.error('Unhandled error in evolution-api-handler:', error);
    const errorMessageString = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: errorMessageString }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
