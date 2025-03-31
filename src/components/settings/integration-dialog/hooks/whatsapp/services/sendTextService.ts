// Import the centralized API key
import { evolutionApiKey } from "./config";
// Assuming getEvolutionURL might be needed if serverUrl isn't always passed
// import { getEvolutionURL } from "@/integrations/supabase/client";


interface SendTextParams {
  serverUrl: string; // Keep allowing specific server URL override if needed
  instance: string;
  // apiKey: string; // Remove apiKey from params
  number: string; // Recipient's phone number
  text: string; // The message text
  // Optional parameters based on the curl example
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: {
    key: { id: string };
    message: { conversation: string };
  };
}

interface SendTextResponse {
  // Define the expected success response structure from the API if known
  // Define the expected success response structure from the API if known
  // Example:
  // messageId?: string;
  // status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow for other properties
}

/**
 * Sends a text message via the WhatsApp API.
 * @param params - The parameters for sending the text message.
 * @returns A promise that resolves with the API response.
 * @throws {Error} If the request fails.
 */
// Update function signature to remove apiKey from destructuring
export const sendTextService = async (params: SendTextParams): Promise<SendTextResponse> => {
  const { serverUrl, instance, number, text, ...optionalData } = params;

  // API Key check
  if (!evolutionApiKey) {
    console.error('API key is missing from config.');
    throw new Error('API key is required to send messages.');
  }

  // Ensure serverUrl doesn't end with a slash to avoid double slashes
  const cleanServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const url = `${cleanServerUrl}/message/sendText/${instance}`;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': evolutionApiKey, // Use imported key
  };

  const body = JSON.stringify({
    number,
    text,
    // Include optional parameters if they exist
    ...(optionalData.delay !== undefined && { delay: optionalData.delay }),
    ...(optionalData.linkPreview !== undefined && { linkPreview: optionalData.linkPreview }),
    ...(optionalData.mentionsEveryOne !== undefined && { mentionsEveryOne: optionalData.mentionsEveryOne }),
    ...(optionalData.mentioned && { mentioned: optionalData.mentioned }),
    ...(optionalData.quoted && { quoted: optionalData.quoted }),
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore JSON parsing error if response is not JSON
      }
      throw new Error(
        `Failed to send text message. Status: ${response.status}. ${errorData ? JSON.stringify(errorData) : response.statusText}`
      );
    }

    // Assuming the API returns JSON on success
    const responseData: SendTextResponse = await response.json();
    return responseData;

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Failed to send text message')) {
      // Re-throw the specific error from the fetch block
      throw error;
    }
    // Handle network errors or other unexpected issues
    throw new Error(
      `Network error or unexpected issue sending text message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
