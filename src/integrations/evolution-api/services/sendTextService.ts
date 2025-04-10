// Config import is no longer needed here as this will use a Supabase function
import { apiServiceInstance } from "@/services/api/apiService"; // Import ApiService
import { getEvolutionCredentials } from "../utils/credentials";


export interface SendTextParams { // Add export
  // serverUrl: string; // Remove serverUrl, will be fetched via credentials
  instance: string;
  integrationId: string; // Add integrationId to fetch credentials
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

export interface SendTextResponse { // Add export
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
 * @returns A promise that resolves with the API response on success.
 * @throws If fetching credentials or the API request fails.
 */
export const sendTextService = async (params: SendTextParams): Promise<SendTextResponse> => {
  // Destructure all params including integrationId
  const { instance, integrationId, number, text, ...optionalData } = params;

  // Removed warning about refactoring as direct call is intended.

  // 1. Fetch credentials (Errors will propagate up)
  const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/message/sendText/${instance}`;
    // console.log(`Frontend: Sending text directly via Evolution API: ${apiUrl}`); // Removed log

    // 3. Construct the payload using logic similar to the edge function
    // Define a type for the payload structure locally if needed, or use 'any' carefully
    const evolutionPayload: {
        number: string;
        text: string;
        options?: {
            delay?: number;
            linkPreview?: boolean;
            mentions?: {
                everyOne?: boolean;
                mentioned?: string[];
            };
            quoted?: { key: { id: string }; message: { conversation: string } };
        };
    } = {
        number,
        text,
        // Construct options object only if optional params exist
        ...(Object.keys(optionalData).length > 0 && {
            options: {
                ...(optionalData.delay !== undefined && { delay: optionalData.delay }),
                ...(optionalData.linkPreview !== undefined && { linkPreview: optionalData.linkPreview }),
                // Construct mentions object only if needed and correctly structured
                ...((optionalData.mentionsEveryOne || optionalData.mentioned) && {
                    mentions: {
                        ...(optionalData.mentionsEveryOne === true && { everyOne: true }), // Ensure boolean check
                        ...(optionalData.mentioned && optionalData.mentioned.length > 0 && { mentioned: optionalData.mentioned }), // Ensure array has items
                    }
                }),
                ...(optionalData.quoted && { quoted: optionalData.quoted }),
            }
        })
    };

    // Remove options if it's empty or contains only an empty mentions object
     if (evolutionPayload.options) {
        if (evolutionPayload.options.mentions && Object.keys(evolutionPayload.options.mentions).length === 0) {
            delete evolutionPayload.options.mentions; // Clean up empty mentions
        }
        if (Object.keys(evolutionPayload.options).length === 0) {
            delete evolutionPayload.options; // Remove options if completely empty
        }
    }


    // console.log("sendTextService: Sending payload:", JSON.stringify(evolutionPayload, null, 2)); // Removed log

    // 4. Make the request using ApiService
    const result = await apiServiceInstance.request<SendTextResponse>(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(evolutionPayload),
    });

    // 5. Return the successful response (error handling done by ApiService)
    // Logging handled by ApiService if enabled.
    // console.log(`sendTextService: Send text successful for ${number} via instance ${instance}.`); // Removed log
    return result;
  /* --- Remove the old commented-out fetch logic --- */
  /*
  const headers = {
    'Content-Type': 'application/json',
    'apikey': evolutionApiKey,
  };

  const body = JSON.stringify({
    number, // Ensure these are defined
    text,   // Ensure these are defined
    // Include optional parameters
    ...(optionalData.delay !== undefined && { delay: optionalData.delay }), // Check optionalData exists
    ...(optionalData.linkPreview !== undefined && { linkPreview: optionalData.linkPreview }), // Check optionalData exists
    ...(optionalData.mentionsEveryOne !== undefined && { mentionsEveryOne: optionalData.mentionsEveryOne }), // Check optionalData exists
    ...(optionalData.mentioned && { mentioned: optionalData.mentioned }), // Check optionalData exists
    ...(optionalData.quoted && { quoted: optionalData.quoted }), // Check optionalData exists
  });

  try {
    // ... (rest of the old fetch logic) ...
  } catch (error) {
    // ... (old error handling) ...
  }
  */
};
