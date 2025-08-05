import { serve } from "std/http/server.ts"; // Use import map alias
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

// Type guard for Error
function isError(e: unknown): e is Error {
  return e instanceof Error && typeof e.message === 'string';
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
    const stringifiedBody = body ? JSON.stringify(body) : undefined;
    if (body) { // Log the object before stringifying for clarity, and the string itself
      console.log(`_handleEvolutionApiCall: Body object being sent to ${apiUrl}:`, JSON.stringify(body, null, 2));
      console.log(`_handleEvolutionApiCall: Stringified body for fetch to ${apiUrl}:`, stringifiedBody);
    }

    const response = await fetch(apiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: stringifiedBody,
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
  let action = actionFromBody || actionFromPath;

  if (typeof action === 'string') {
    action = action.trim(); // Trim whitespace just in case
  }

  console.log(`Determined action: '${action}' (from body: ${!!actionFromBody}, from path: ${!!actionFromPath}) - Trimmed`);
  
  if (typeof action === 'string') {
    const charCodes: number[] = [];
    for (let i = 0; i < action.length; i++) {
      charCodes.push(action.charCodeAt(i));
    }
    console.log(`Action string character codes: [${charCodes.join(', ')}]`);
  }

  // Explicitly log the comparison result
  const isSendTextOrMedia = (action === 'sendText' || action === 'send-media'); // Corrected case for 'send-media'
  console.log(`Comparison (action === 'sendText' || action === 'send-media'): ${isSendTextOrMedia}`);

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
            if (isError(apiError)) {
              statusMessage = `Evolution API call failed: ${apiError.message}`;
            } else if (typeof apiError === 'string') {
              statusMessage = `Evolution API call failed: ${apiError}`;
            } else {
              statusMessage = `Evolution API call failed: ${JSON.stringify(apiError ?? "Unknown API error details for get-status")}`;
            }
          }
        } else {
          let errorMessageDetail = 'API key or Base URL missing';
          if (credError) {
            if (isError(credError)) { // Check for Error instance first
              errorMessageDetail = credError.message;
            } else if (typeof credError === 'string') { // Check for string
              errorMessageDetail = credError;
            } else {
              // Fallback for any other truthy type of credError (e.g., an object that's not an Error instance)
              // or if credError was null but somehow passed the `if (credError)` (should not happen).
              errorMessageDetail = `Unexpected error format: ${JSON.stringify(credError)}`;
            }
          }
          statusMessage = `Failed to get credentials: ${errorMessageDetail}`;
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
    } else if (action === 'sendText' || action === 'send-media' || action === 'send-buttons') { 
      console.log(`evolution-api-handler: '${action}' action received. Body parsed:`, JSON.stringify(bodyParsed, null, 2));
      const {
        integrationConfigId,
        number, // For sendText
        text,   // For sendText or caption for sendMedia
        recipientJid, // For sendMedia and send-buttons
        mediaData,    // For sendMedia (URL or base64)
        mimeType,     // For sendMedia
        filename,     // For sendMedia
        caption,      // For sendMedia (alternative to text)
        title,        // For send-buttons
        description,  // For send-buttons
        footer,       // For send-buttons
        buttons       // For send-buttons
      } = bodyParsed as {
        integrationConfigId?: string;
        number?: string;
        text?: string;
        recipientJid?: string;
        mediaData?: string;
        mimeType?: string;
        filename?: string;
        caption?: string;
        title?: string;
        description?: string;
        footer?: string;
        buttons?: Array<{
          type: string;
          title: string;
          displayText: string;
          id: string;
        }>;
      };

      if (!integrationConfigId ||
          (action === 'sendText' && (!number || !text)) ||
          (action === 'send-media' && (!recipientJid || !mediaData || !mimeType || !filename)) ||
          (action === 'send-buttons' && (!recipientJid || !title || !description || !buttons || buttons.length === 0))
      ) {
        console.error(`evolution-api-handler: '${action}' missing parameters. Body:`, bodyParsed);
        return new Response(JSON.stringify({ error: `Missing required parameters for ${action}` }), {
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

      // Log the fetched config values before using them
      console.log(`Fetched config for integrationConfigId '${integrationConfigId}': instance_display_name='${config.instance_display_name}', instance_id='${config.instance_id}'`);

      let evolutionApiUrl: string;
      let payload: Record<string, unknown>;
      // Reverting to use instance_display_name as per user feedback and successful single send logs.
      // The user must ensure this field contains the correct Evolution API instance name.
      const evolutionInstanceName = config.instance_display_name; 

      if (!evolutionInstanceName) {
        console.error(`Critical: Evolution API instance_display_name is missing from config for integration_config_id ${integrationConfigId}`);
        return new Response(JSON.stringify({ error: "Configuration error: Evolution API instance_display_name is missing." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
        });
      }

      if (action === 'sendText') {
        const recipientNumber = number!.includes('@') ? number : `${number}@c.us`;
        evolutionApiUrl = `${config.integration.base_url}/message/sendText/${evolutionInstanceName}`;
        // Corrected payload: 'text' should be a top-level property, not nested in textMessage
        payload = { number: recipientNumber, options: { presence: "composing", delay: 1200}, text: text! };
        console.log(`Action: sendText to ${recipientNumber} via instance name: ${evolutionInstanceName} (DB config ID: ${integrationConfigId})`);
      } else if (action === 'send-media') { // Explicitly check for 'send-media'
        console.log(`send-media action: Received body keys: ${Object.keys(bodyParsed).join(', ')}`);
        console.log(`send-media action: Values - integrationConfigId: ${integrationConfigId}, recipientJid: ${recipientJid}, mimeType: ${mimeType}, filename: ${filename}, mediaData (present): ${!!mediaData}, caption: ${caption}, text: ${text}`);

        evolutionApiUrl = `${config.integration.base_url}/message/sendMedia/${evolutionInstanceName}`;
        const determinedMediatype = mimeType!.startsWith('image') ? 'image'
                                  : mimeType!.startsWith('video') ? 'video'
                                  : mimeType!.startsWith('audio') ? 'audio'
                                  : 'document';
        console.log(`send-media action: Determined mediatype: '${determinedMediatype}' from mimeType: '${mimeType}'`);

        let finalMediaData = mediaData!;
        // Check if mediaData is a data URL and strip the prefix
        if (mediaData && mediaData.startsWith('data:') && mediaData.includes(';base64,')) {
          finalMediaData = mediaData.substring(mediaData.indexOf(';base64,') + ';base64,'.length);
          console.log(`send-media action: Stripped data URL prefix. Media data is now raw base64.`);
        }

        payload = {
          number: recipientJid!,
          options: { presence: "composing", delay: 1200 },
          mediatype: determinedMediatype, 
          media: finalMediaData,          // Use potentially stripped base64 data
          mimetype: mimeType!,            
          fileName: filename!,            
          caption: caption || text || undefined, 
        };
        console.log(`Action: sendMedia to ${recipientJid} via instance name: ${evolutionInstanceName} (DB config ID: ${integrationConfigId}) Final Payload for API:`, JSON.stringify(payload, null, 2));
      } else if (action === 'send-buttons') {
        console.log(`send-buttons action: Received body keys: ${Object.keys(bodyParsed).join(', ')}`);
        console.log(`send-buttons action: Values - integrationConfigId: ${integrationConfigId}, recipientJid: ${recipientJid}, title: ${title}, description: ${description}, buttons: ${JSON.stringify(buttons)}`);

        evolutionApiUrl = `${config.integration.base_url}/message/sendButtons/${evolutionInstanceName}`;
        
        // Format the recipient number the same way as sendText
        const recipientNumber = recipientJid!.includes('@') ? recipientJid : `${recipientJid}@c.us`;
        
        payload = {
          number: recipientNumber,
          title: title!,
          description: description!,
          footer: footer || undefined,
          buttons: buttons!,
          options: { presence: "composing", delay: 1200 }
        };
        console.log(`Action: sendButtons to ${recipientNumber} via instance name: ${evolutionInstanceName} (DB config ID: ${integrationConfigId}) Final Payload for API:`, JSON.stringify(payload, null, 2));
      } else {
        // This case should ideally not be reached if the outer 'if/else if' is correct for 'sendText', 'send-media', or 'send-buttons'
        console.error(`Internal logic error: Action '${action}' was expected to be 'sendText', 'send-media', or 'send-buttons' but was not handled.`);
        return new Response(JSON.stringify({ error: "Internal server error: Unhandled message action." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
        });
      }

      const providerResponse = await _handleEvolutionApiCall(evolutionApiUrl, 'POST', config.integration.api_key, payload);

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
        } else if (typeof apiError === 'string') {
          errorMessageString = apiError;
        } else {
          errorMessageString = JSON.stringify(apiError ?? "Unknown API error details during sync");
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
