import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface SendTextServerSideParams {
  instance: string; // Instance ID from the frontend selection
  integrationId: string; // This is integrations_config.id (PK of the integrations_config table)
  number: string; // Recipient's phone number
  text: string; // The message text
  mediaUrl?: string; // Optional URL for media
  mediaType?: 'image' | 'video' | 'audio' | 'document'; // Optional type of media
  authUserId: string; // User ID for authentication override
}

export interface SendTextServerSideResponse {
  success: boolean;
  message?: string;
  data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
}

/**
 * Server-side version of sendTextService that uses service role authentication
 * for calling edge functions from server contexts like broadcast services.
 */
export const sendTextServiceServerSide = async (params: SendTextServerSideParams): Promise<SendTextServerSideResponse> => {
  const { instance, integrationId, number, text, mediaUrl, mediaType, authUserId } = params;

  // Create Supabase client with service role key for server-side operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for server-side operation');
  }

  const supabaseServerClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Prepare the payload for the edge function
  const functionPayload: {
    integration_config_id: string;
    recipient_identifier: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'document';
    message_content: string;
    media_url?: string;
    auth_user_id_override: string;
  } = {
    integration_config_id: integrationId,
    recipient_identifier: number,
    message_type: mediaUrl && mediaType ? mediaType : 'text',
    message_content: text,
    auth_user_id_override: authUserId,
  };

  if (mediaUrl && mediaType) {
    functionPayload.media_url = mediaUrl;
  }

  // Invoke the Supabase Edge Function with internal call headers
  const { data, error } = await supabaseServerClient.functions.invoke<SendTextServerSideResponse>('send-message-handler', {
    body: functionPayload,
    headers: {
      'x-internal-call': 'supabase-functions-orchestrator',
    },
  });

  if (error) {
    let detailedErrorMessage = `Edge Function invocation failed: ${error.message}`;
    let functionResponseBody = '(Could not determine Edge Function response body)';
    const responseStatus = error.context?.status || 'N/A';

    if (error.context && typeof error.context.text === 'function') {
      try {
        const bodyText = await error.context.text();
        functionResponseBody = bodyText;
        try {
          const jsonParsed = JSON.parse(bodyText);
          if (jsonParsed && jsonParsed.error) {
            functionResponseBody = `Error from function: ${jsonParsed.error}`;
          } else if (jsonParsed && jsonParsed.message) {
            functionResponseBody = `Message from function: ${jsonParsed.message}`;
          } else {
            functionResponseBody = `Raw body: ${bodyText}`;
          }
        } catch (e) {
          functionResponseBody = `Raw body (not JSON): ${bodyText}`;
        }
      } catch (readError) {
        functionResponseBody = `(Failed to read Edge Function response body: ${readError.message})`;
      }
    }
    
    detailedErrorMessage += ` | Status: ${responseStatus} | Response: ${functionResponseBody}`;
    console.error(
      'Error invoking send-message-handler Edge Function (server-side). Original error object:', error, 
      `Response Status: ${responseStatus}`, 
      `Processed Response Body: ${functionResponseBody}`
    );
    throw new Error(detailedErrorMessage);
  }

  // Check the response structure from the Edge Function
  if (!data || typeof data !== 'object') {
     console.error('Invalid response structure from Edge Function (server-side):', data);
     throw new Error('Invalid response received from Edge Function.');
  }

  return data;
};