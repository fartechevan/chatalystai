import { supabase } from "@/integrations/supabase/client";
import { getEvolutionCredentials } from "../utils/credentials";

// Define the expected shape of the API response for instance creation
interface CreateInstanceApiResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    // Add other relevant fields if the API returns more
  };
  hash: {
    apikey: string;
  };
  // Include other potential top-level fields like qrcode, base64 etc. if applicable
  qrcode?: {
    base64?: string;
    pairingCode?: string;
  };
  base64?: string;
  pairingCode?: string;
}

// Helper type guard to check for error structure
interface ApiErrorWithMessage {
    message: string | string[];
}
function hasMessage(obj: unknown): obj is ApiErrorWithMessage {
    // Check if obj is an object and has a 'message' property that's string or string[]
    return typeof obj === 'object' &&
           obj !== null &&
           'message' in obj &&
           (typeof (obj as ApiErrorWithMessage).message === 'string' || Array.isArray((obj as ApiErrorWithMessage).message));
}

interface ApiErrorWithError {
    error: string;
}
function hasError(obj: unknown): obj is ApiErrorWithError {
     // Check if obj is an object and has an 'error' property that's a string
     return typeof obj === 'object' &&
            obj !== null &&
            'error' in obj &&
            typeof (obj as ApiErrorWithError).error === 'string';
}

interface ApiErrorWithResponse {
    response: { message?: string; error?: string };
}
function hasResponseError(obj: unknown): obj is ApiErrorWithResponse {
     // Check if obj is an object, has 'response' property which is also an object, and that object has message or error
     return typeof obj === 'object' &&
            obj !== null &&
            'response' in obj &&
            typeof (obj as { response: unknown }).response === 'object' && // Check if response exists and is object
            (obj as { response: unknown }).response !== null &&
            ('message' in ((obj as { response: unknown }).response as object) || // Check for message in response object
             'error' in ((obj as { response: unknown }).response as object));   // Check for error in response object
}


/**
 * Creates a new Evolution API instance.
 * @param instanceName The desired name for the new instance.
 * @param integrationId The ID of the integration record in Supabase.
 * @returns {Promise<{success: boolean, instanceData?: CreateInstanceApiResponse, error?: string}>}
 */
export async function createEvolutionInstance(
  instanceName: string,
  integrationId: string
): Promise<{success: boolean, instanceData?: CreateInstanceApiResponse, error?: string}> {
  try {
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    if (!apiKey || !baseUrl) {
      throw new Error("API Key or Base URL not found for this integration.");
    }

    const apiUrl = `${baseUrl}/instance/create`;

    // Construct body based on Postman collection v2.2.2
    const requestBody = {
      instanceName: instanceName,
      qrcode: true, // Optional, but seems desired
      integration: "WHATSAPP-BAILEYS" // Optional, but explicitly setting default
      // Removed description and settings fields
    };


    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    // Try to parse JSON regardless of status, as error details might be in the body
    let responseData: unknown; // Use unknown instead of any
    try {
        responseData = await response.json();
    } catch (jsonError) {
        console.warn("[createEvolutionInstance] Failed to parse API response as JSON.", jsonError);
        // If JSON parsing fails, try to get text, but don't error out here yet
        try {
            const textResponse = await response.text();
            console.warn("[createEvolutionInstance] API Response Text:", textResponse);
            responseData = { error: `Non-JSON response: ${textResponse}` }; // Create a placeholder error object
        } catch (textError) {
             console.error("[createEvolutionInstance] Failed to read API response as text.", textError);
             responseData = { error: "Failed to read API response body." };
        }
    }


    if (!response.ok) {
      // Attempt to get a more specific error message from the API response
      let detail = "Unknown error";
      if (responseData) {
        // Use type guards to safely access properties
        if (hasMessage(responseData)) {
           if (Array.isArray(responseData.message)) {
               detail = responseData.message.join(', ');
           } else {
               detail = responseData.message;
           }
        } else if (hasError(responseData)) {
           detail = responseData.error;
        } else if (hasResponseError(responseData)) {
           // Type guard ensures responseData.response exists and is an object here
           detail = responseData.response.message || responseData.response.error || "Nested response error";
        } else {
           // Fallback to stringify if no known error structure matches
           detail = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
        }
      }
      const errorMessage = `API Error (${response.status} ${response.statusText}): ${detail}`;
      console.error(`[createEvolutionInstance] Failed to create instance. Full Response:`, responseData); // Log full object
      throw new Error(errorMessage); // Throw the detailed message
    }

    // --- BEGIN: Update integrations_config after successful creation ---
    // Assuming responseData is CreateInstanceApiResponse if response.ok is true
    const createdInstanceData = responseData as CreateInstanceApiResponse;
    const instanceId = createdInstanceData.instance?.instanceId;
    const token = createdInstanceData.hash?.apikey; // Assuming the token is here

    if (!instanceId || !token) {
        console.warn("[createEvolutionInstance] Instance ID or token missing in API response after creation.", createdInstanceData);
        // Decide if this should be treated as an error or just a warning
        // For now, let's proceed but log a warning. The connection step might fail later.
    } else {
        const { error: upsertError } = await supabase
            .from('integrations_config')
            .upsert({
                integration_id: integrationId,
                instance_id: instanceId,
                token: token,
                instance_display_name: instanceName, // Use the name provided for creation
                status: 'created' // Set an initial status, 'connecting' or 'open' will be set later
            }, { onConflict: 'integration_id' });

        if (upsertError) {
            console.error("[createEvolutionInstance] Failed to upsert integrations_config after instance creation:", upsertError);
            // Consider if this should throw an error or just be logged
            // Throwing might be better to indicate the full process wasn't successful
            throw new Error(`Failed to upsert configuration after instance creation: ${upsertError.message}`);
        }
    }
    // --- END: Update integrations_config ---


    return { success: true, instanceData: responseData as CreateInstanceApiResponse };

  } catch (error) {
    console.error("[createEvolutionInstance] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
