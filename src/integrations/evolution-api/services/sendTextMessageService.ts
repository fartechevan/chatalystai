import { getEvolutionCredentials } from "../utils/credentials";

interface SendTextPayload {
  number: string;
  text: string;
  // Add other optional fields from Evolution API docs if needed (e.g., quotedMsgId)
}

// Define a basic structure for the expected success response
interface EvolutionSendResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string; // Or other message types
  };
  messageTimestamp: number;
  status: string; // e.g., 'PENDING'
  // Add other fields based on actual API response
}

/**
 * Sends a plain text message via the Evolution API directly.
 * @param instanceId The ID of the instance to send from.
 * @param integrationId The ID of the integration to fetch credentials for.
 * @param payload The message payload (number, text).
 * @returns Promise<EvolutionSendResponse> The response from the Evolution API.
 * @throws If fetching credentials or calling the Evolution API fails.
 */
export const sendTextMessage = async (
  instanceId: string | null,
  integrationId: string | null,
  payload: SendTextPayload
): Promise<EvolutionSendResponse> => { // Use specific return type

  if (!instanceId || !integrationId) {
    console.error('Instance ID and Integration ID are required for sending messages.');
    throw new Error('Instance ID and Integration ID are required.');
  }
  if (!payload || !payload.number || !payload.text) {
    console.error('Payload with number and text is required.');
    throw new Error('Payload with number and text is required.');
  }

  console.log(`Attempting to send text message from instance ${instanceId} (Integration: ${integrationId})...`);

  try {
    // 1. Fetch credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/message/sendText/${instanceId}`;
    console.log(`Frontend: Sending text directly via Evolution API: ${apiUrl}`);

    // 3. Make the direct request to the Evolution API
    const evoResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    // 4. Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Frontend: Evolution API send text failed (${evoResponse.status}): ${errorText}`);
      // Try to parse error details if JSON
      let details = errorText;
      try {
        const jsonError = JSON.parse(errorText);
        details = jsonError.message || jsonError.error || details;
      } catch (e) { /* Ignore parsing error */ }
      throw new Error(`Evolution API Send Text Error (${evoResponse.status}): ${details}`);
    }

    // 5. Parse and return the successful response with type assertion
    const result = await evoResponse.json() as EvolutionSendResponse;
    console.log(`Frontend: Send text successful for instance ${instanceId}. Response:`, result);
    return result;

  } catch (error) {
    // Catch errors from credential fetching or fetch itself
    console.error(`Error during sendTextMessage service call for instance ${instanceId}:`, error);
    // Rethrow the error to be handled by the caller
    throw error;
  }
};
