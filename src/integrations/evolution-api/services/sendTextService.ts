// Removed ApiService and getEvolutionCredentials imports as they are no longer needed here
import { supabase } from '@/integrations/supabase/client'; // Keep Supabase client import

export interface SendTextParams {
  instance: string; // Instance ID from the frontend selection
  integrationId: string; // Integration ID to fetch credentials and config
  number: string; // Recipient's phone number
  text: string; // The message text
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
  // Destructure params - instance is now the DB integration ID
  const { integrationId, number, text } = params; // Removed instance, added integrationId

  console.log(`sendTextService: Invoking Edge Function 'evolution-api-handler' for integration ${integrationId}`);

  // Construct the payload for the Edge Function
  const functionPayload = {
    action: 'send-text',
    instanceId: integrationId, // Pass the DB integration ID
    number: number, // Pass the raw number, let Edge Function handle formatting if needed
    text: text,
    // Pass optional data if the Edge Function is designed to handle it
    // ...optionalData
  };

  console.log("sendTextService: Invoking Edge Function with payload:", JSON.stringify(functionPayload, null, 2));

  // Invoke the Supabase Edge Function
  const { data, error } = await supabase.functions.invoke<SendTextResponse>('evolution-api-handler', {
    body: functionPayload,
  });

  if (error) {
    console.error('Error invoking evolution-api-handler Edge Function:', error);
    throw new Error(`Edge Function invocation failed: ${error.message}`);
  }

  // Check the response structure from the Edge Function
  if (!data || typeof data !== 'object') {
     console.error('Invalid response structure from Edge Function:', data);
     throw new Error('Invalid response received from Edge Function.');
  }

  // Handle potential errors returned in the Edge Function's response body
  if (data.error) {
    console.error('Error returned from evolution-api-handler Edge Function:', data.error);
    throw new Error(`Edge Function execution failed: ${data.error}`);
  }

  // Assuming the Edge Function returns a success indicator and potentially data
  if (!data.success) {
     console.warn('Edge Function indicated failure:', data.message || 'No specific message provided.');
     throw new Error(data.message || 'Edge Function execution failed without specific error.');
  }

  console.log(`sendTextService: Edge Function call successful for ${number}. Response data:`, data.data);

  // Return the data part of the Edge Function's response
  // Adjust based on the actual structure returned by your Edge Function on success
  return data; // Return the whole response object from the function
};
