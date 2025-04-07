import { supabase } from "@/integrations/supabase/client"; // Import supabase client
// Config import is no longer needed here as this will use a Supabase function
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
  const { instance, number, text, ...optionalData } = params; // Removed serverUrl from destructuring

  // TODO: Refactor this service to call a Supabase function
  // The Supabase function will handle fetching the API key and server URL,
  // and calling the Evolution API.
  console.warn("sendTextService needs refactoring to use a Supabase function.");

  // Placeholder implementation removed, now calling the actual function
  try {
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
     // Remove options if it's empty after construction
     if (Object.keys(payload.options).length === 0) {
         delete payload.options;
     }

    // Call the Supabase function 'send-whatsapp-text'
    const { data: responseData, error } = await supabase.functions.invoke('send-whatsapp-text', {
      body: { instanceId: instance, payload: payload } // Pass instanceId and the constructed payload
    });

    if (error) {
      console.error('Error invoking Supabase function send-whatsapp-text:', error);
      let errorDetails = error.message;
       if (typeof error === 'object' && error !== null && 'context' in error && typeof (error as { context: unknown }).context === 'object' && (error as { context: unknown }).context !== null && 'details' in (error as { context: { details: unknown } }).context) {
           errorDetails = (error as { context: { details: string } }).context.details || error.message;
       }
      throw new Error(`Failed to invoke send text function: ${errorDetails}`);
    }

     // Check if the function returned an error structure from the Evolution API call
     if (responseData && responseData.error) {
         console.error(`Send text function reported an error: ${responseData.error}`, responseData);
         throw new Error(responseData.error);
     }

    console.log(`Send text successful for ${number} via instance ${instance}`);
    return responseData as SendTextResponse; // Cast as the expected response type

  } catch (error) {
     throw new Error(
       `Error sending text message: ${error instanceof Error ? error.message : String(error)}`
     );
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
