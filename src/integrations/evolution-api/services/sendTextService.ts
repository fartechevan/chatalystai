// Config import is no longer needed here as this will use a Supabase function
// Assuming getEvolutionURL might be needed if serverUrl isn't always passed
// import { getEvolutionURL } from "@/integrations/supabase/client";
import { getEvolutionCredentials } from "../utils/credentials"; // Import credential utility


interface SendTextParams {
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
export const sendTextService = async (params: SendTextParams): Promise<SendTextResponse> => {
  // Destructure all params including integrationId
  const { instance, integrationId, number, text, ...optionalData } = params;

  // TODO: Refactor this service to call a Supabase function
  // The Supabase function will handle fetching the API key and server URL,
  // and calling the Evolution API.
  console.warn("sendTextService needs refactoring to use a Supabase function.");

  try {
    // 1. Fetch credentials
    const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);

    // 2. Construct the Evolution API URL
    const apiUrl = `${baseUrl}/message/sendText/${instance}`;
    console.log(`Frontend: Sending text directly via Evolution API: ${apiUrl}`);

    // 3. Construct the payload (keeping existing logic for options)
    const payload = {
      number,
      text,
       // Construct options object based on Evolution API structure if optional params exist
       options: {
         ...(optionalData.delay !== undefined && { delay: optionalData.delay }),
         ...(optionalData.linkPreview !== undefined && { linkPreview: optionalData.linkPreview }),
         // Construct mentions object only if needed
         ...((optionalData.mentionsEveryOne || optionalData.mentioned) && {
             mentions: {
                 ...(optionalData.mentionsEveryOne && { everyOne: true }),
                 ...(optionalData.mentioned && { mentioned: optionalData.mentioned }),
             }
         }),
         ...(optionalData.quoted && { quoted: optionalData.quoted }),
       }
     };
    // Remove options if it's empty
    if (Object.keys(payload.options).length === 0) {
        delete payload.options;
    }

    // 4. Make the direct request to the Evolution API
    const evoResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    // 5. Check if the Evolution API request was successful
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

    // 6. Parse and return the successful response
    const result = await evoResponse.json() as SendTextResponse;
    console.log(`Frontend: Send text successful for ${number} via instance ${instance}. Response:`, result);
    return result;

  } catch (error) {
    // Catch errors from credential fetching or fetch itself
    console.error(`Error during sendTextService call for instance ${instance}:`, error);
    // Rethrow the error to be handled by the caller
    throw error;
  }
  /* --- Original direct fetch logic (to be removed/refactored) --- */
  /*
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
  */
};
