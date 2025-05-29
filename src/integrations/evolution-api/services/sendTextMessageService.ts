import { apiServiceInstance } from "@/services/api/apiService"; // Import ApiService
import { getEvolutionCredentials } from "../utils/credentials";

interface SendTextPayload {
  number: string; // Recipient phone number
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
 * @returns Promise<EvolutionSendResponse> The response from the Evolution API on success.
 * @throws If fetching credentials or the API request fails.
 */
export const sendTextMessage = async (
  instanceId: string | null,
  integrationId: string | null,
  payload: SendTextPayload,
): Promise<EvolutionSendResponse> => {
  // Input validation remains the same
  if (!instanceId || !integrationId) {
    // console.error("sendTextMessage: Instance ID and Integration ID are required."); // Removed log
    throw new Error("Instance ID and Integration ID are required for sending messages.");
  }
  if (!payload || !payload.number || !payload.text) {
    // console.error("sendTextMessage: Payload with number and text is required."); // Removed log
    throw new Error("Payload with number and text is required.");
  }

  // 1. Fetch credentials (Errors will propagate up)
  const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/message/sendText/${instanceId}`;

    // 3. Make the request using ApiService
    const result = await apiServiceInstance.request<EvolutionSendResponse>(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    // 4. Return the successful response (error handling done by ApiService)
    // Logging handled by ApiService if enabled.
    return result;
};
