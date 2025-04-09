import { getEvolutionCredentials } from '../utils/credentials';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

// Define a more specific type for the expected creation response, including potential QR data
interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId?: string; // Add the missing instanceId field
    status?: string; // Status might be 'created', 'connecting', etc.
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
  hash?: {
    apikey: string; // The token for the new instance
  };
  qrcode?: {
    code?: string;
    base64?: string; // QR code might be nested here
    urlCode?: string;
    pairingCode?: string;
    count?: number;
  };
  // Direct base64 might also be returned based on connect endpoint behavior
  base64?: string;
  pairingCode?: string;
  code?: string; // The long pairing code string
  count?: number;
}


/**
 * Creates a new Evolution API instance.
 * @param integrationId - The ID of the integration to fetch credentials for.
 * @param customerId - The customer ID from the integration metadata.
 * @param projectId - The project ID from the integration metadata.
 * @param integrationId - The ID of the integration to fetch credentials for.
 * @param metadata - The metadata object containing instance configuration.
 * @returns A promise that resolves to the creation response data, including instance details and potentially QR/token.
 * @throws If fetching credentials or calling the Evolution API fails.
 */

// Removed the specific InstanceMetadata interface definition from this file.
// The function now accepts a more flexible object for metadata,
// but we define and export a base type for common properties to improve type safety.
export interface BaseMetadata { // Export the interface
  instanceName?: string;
  webhook?: {
    url?: string;
    events?: (string | null)[]; // Allow nulls initially
    ByEvents?: boolean;
  };
  // Allow any other properties using 'unknown' for better type safety than 'any'
  [key: string]: unknown;
}

export async function createEvolutionInstance(
  integrationId: string,
  metadata: BaseMetadata // Use the BaseMetadata type
): Promise<CreateInstanceResponse> {

  // Basic validation
  if (!metadata) {
    throw new Error("Metadata object is required for instance creation.");
  }
  if (!integrationId) throw new Error("Integration ID is required.");

  // Access instanceName directly for logging, assuming it exists in metadata
  const instanceName = metadata.instanceName || 'Unknown Instance';

  console.log(`--- createEvolutionInstance: Starting creation for instance ${instanceName} (Integration ID: ${integrationId}) ---`);
  console.log(`--- createEvolutionInstance: Received Metadata:`, metadata);


  try {
    // 1. Get Evolution API credentials (using the main integration API key for creation)
    // Metadata isn't strictly needed here as customer/project IDs are passed in
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const createUrl = `${baseUrl}/instance/create`;
    console.log(`--- createEvolutionInstance: Calling Evolution API: ${createUrl} ---`);

    // 3. Generate a UUID for the token
    const generatedToken = uuidv4().toUpperCase(); // Generate UUID and convert to uppercase if needed

    // Define interface for the API request body (matching the expected nested structure)
    interface CreateInstanceApiPayload {
      instanceName: string;
      token: string;
      qrcode: boolean;
      integration: string;
      webhook?: {
        url?: string;
        events?: string[];
        ByEvents?: boolean;
      };
      // No specific payload interface needed here as we spread the generic metadata.
    }

    // 4. Prepare the request body by spreading the received metadata and adding the generated token
    // Ensure the generated token takes precedence if metadata somehow contains a 'token' field
    const requestBody = {
      ...metadata, // Spread all properties from the input metadata
      token: generatedToken, // Add/overwrite with the generated token
    };
    // Note: If the Evolution API strictly rejects unknown fields,
    // you might need to selectively pick known fields from metadata instead of spreading.
    // However, based on the request, we'll spread the entire metadata object.
    // delete requestBody.projectId; // Example if API rejects unknown fields

    // Clean up potential nulls within the nested events array if it exists
    // Use the defined BaseMetadata structure for safer access
    if (requestBody.webhook && Array.isArray(requestBody.webhook.events)) {
        // Filter out nulls, the result will be string[]
        requestBody.webhook.events = requestBody.webhook.events.filter((e): e is string => e !== null);
    }

    const body = JSON.stringify(requestBody);
    console.log("--- createEvolutionInstance: Request Body Sent to API:", body); // Log the final body


    // 5. Make the POST request
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey, // Use the main API key for creation
        'Content-Type': 'application/json',
      },
      body: body,
    });

    console.log(`--- createEvolutionInstance: Evolution API response status: ${response.status} ---`);

    // 6. Handle response
    const responseData = await response.json();

    if (response.ok) {
      console.log(`--- createEvolutionInstance: Successfully created instance ${instanceName}. Response:`, responseData);

      // Ensure the token is correctly represented in the responseData for consistency,
      // handling cases where 'hash' might be a string or an object.
      let finalToken = generatedToken; // Default to the one we generated
      if (typeof responseData.hash === 'string') {
          // If hash is a string, assume it's the token returned by the API
          finalToken = responseData.hash;
          console.log(`--- createEvolutionInstance: API returned token directly in 'hash' string.`);
          // Standardize the structure for downstream use
          responseData.hash = { apikey: finalToken };
      } else if (responseData.hash?.apikey) {
          // If hash is an object with apikey, use that token
          finalToken = responseData.hash.apikey;
          console.log(`--- createEvolutionInstance: API returned token in 'hash.apikey'.`);
      } else {
          // If hash is missing or doesn't have apikey, ensure our generated token is set
          if (!responseData.hash) responseData.hash = {};
          responseData.hash.apikey = finalToken;
          console.log(`--- createEvolutionInstance: API did not return token in 'hash', using generated token.`);
      }

      // The responseData should now consistently have responseData.hash.apikey
      return responseData as CreateInstanceResponse;
    } else {
      // Handle specific error cases, e.g., instance already exists
      let errorText = `Status: ${response.status} ${response.statusText}`;
      const detail = responseData.message || responseData.error || JSON.stringify(responseData);
      errorText += ` - ${detail}`;

      console.error(`--- createEvolutionInstance: Error from Evolution API: ${errorText} ---`);
      // Throw a detailed error
      throw new Error(`Failed to create instance: ${errorText}`);
    }

  } catch (error) {
    console.error(`--- createEvolutionInstance: Error during execution for instance ${instanceName} ---`, error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}
