// Removed ApiService and getEvolutionCredentials imports as they are no longer needed here
import { supabase } from '@/integrations/supabase/client'; // Keep Supabase client import

export interface SendTextParams {
  instance: string; // Instance ID from the frontend selection (Note: This is likely the Evolution API instance name, not a DB ID)
  integrationId: string; // This is integrations_config.id (PK of the integrations_config table)
  number: string; // Recipient's phone number
  text: string; // The message text
  mediaUrl?: string; // Optional URL for media
  mediaType?: 'image' | 'video' | 'audio' | 'document'; // Optional type of media
  // Optional parameters
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: {
    key: { id: string };
    message: { conversation: string };
  };
}

export interface SendTextResponse {
  // Define the expected success response structure from the Edge Function
  success: boolean;
  message?: string;
  data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
}

/**
 * Sends a text message by invoking the 'evolution-api-handler' Supabase Edge Function.
 * @param params - The parameters for sending the text message.
 * @returns A promise that resolves with the API response on success.
 * @throws If fetching credentials, display name, or the API request fails.
 */
export const sendTextService = async (params: SendTextParams): Promise<SendTextResponse> => {
  // Destructure params
  const { integrationId, number, text, mediaUrl, mediaType } = params; // Added mediaUrl, mediaType

  // Explicitly check for an active session before invoking the function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('sendTextService: No active session found. Aborting Edge Function call.');
    throw new Error('No active session. Please log in again.');
  }

  // Construct the payload for the Edge Function
  const functionPayload: {
    integration_config_id: string;
    recipient_identifier: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'document'; // Updated message_type
    message_content: string; // For text messages or captions
    media_url?: string; // For media messages
    // delay?: number; // Example of other optional params
  } = {
    integration_config_id: integrationId,
    recipient_identifier: number,
    message_type: mediaUrl && mediaType ? mediaType : 'text',
    message_content: text, // Text content or caption for media
    // Optional parameters from SendTextParams can be added here if send-message-handler supports them
    // delay: params.delay,
    // linkPreview: params.linkPreview,
    // etc.
  };

  if (mediaUrl && mediaType) {
    functionPayload.media_url = mediaUrl;
    // The message_content (text) will serve as the caption if the handler supports it.
  }

  // Invoke the Supabase Edge Function
  const { data, error } = await supabase.functions.invoke<SendTextResponse>('send-message-handler', { // Target correct function
    body: functionPayload,
  });

  if (error) { // error is FunctionsHttpError
    let detailedErrorMessage = `Edge Function invocation failed: ${error.message}`;
    let functionResponseBody = '(Could not determine Edge Function response body)';
    const responseStatus = error.context?.status || 'N/A'; // Changed to const

    if (error.context && typeof error.context.text === 'function') { // error.context is a Response object
      try {
        const bodyText = await error.context.text(); // Asynchronously read the response body as text
        functionResponseBody = bodyText;
        // Try to parse as JSON to get a more specific error message if available
        try {
          const jsonParsed = JSON.parse(bodyText);
          if (jsonParsed && jsonParsed.error) {
            functionResponseBody = `Error from function: ${jsonParsed.error}`;
          } else if (jsonParsed && jsonParsed.message) {
            functionResponseBody = `Message from function: ${jsonParsed.message}`;
          } else {
            // If not a structured error, use the full text.
            functionResponseBody = `Raw body: ${bodyText}`;
          }
        } catch (e) {
          // Not JSON, or malformed. Use the raw text.
          functionResponseBody = `Raw body (not JSON): ${bodyText}`;
        }
      } catch (readError) {
        functionResponseBody = `(Failed to read Edge Function response body: ${readError.message})`;
      }
    }
    
    detailedErrorMessage += ` | Status: ${responseStatus} | Response: ${functionResponseBody}`;
    // Log the original error object, the status, and the processed response body
    console.error(
      'Error invoking send-message-handler Edge Function. Original error object:', error, 
      `Response Status: ${responseStatus}`, 
      `Processed Response Body: ${functionResponseBody}`
    );
    throw new Error(detailedErrorMessage);
  }

  // Check the response structure from the Edge Function
  if (!data || typeof data !== 'object') {
     console.error('Invalid response structure from Edge Function:', data);
     throw new Error('Invalid response received from Edge Function.');
  }

  // Handle potential errors returned in the Edge Function's response body
  if (data.error) {
    console.error('Error returned from send-message-handler Edge Function:', data.error);
    throw new Error(`Edge Function execution failed: ${data.error}`);
  }

  // Assuming the Edge Function returns a success indicator and potentially data
  if (!data.success) {
     console.warn('Edge Function indicated failure:', data.message || 'No specific message provided.');
     throw new Error(data.message || 'Edge Function execution failed without specific error.');
  }

  // Return the data part of the Edge Function's response
  // Adjust based on the actual structure returned by your Edge Function on success
  return data; // Return the whole response object from the function
};
