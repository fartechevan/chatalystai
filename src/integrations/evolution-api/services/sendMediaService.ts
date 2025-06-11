import { supabase } from "@/integrations/supabase/client";

export interface SendMediaParams {
  instance: string; // Evolution Instance Name
  integrationId: string; // DB ID from integrations_config, for context/logging if needed by backend
  number: string; // Recipient JID (e.g., xxxxx@c.us)
  media: string; // Base64 encoded media
  mimetype: string; // e.g., image/jpeg, image/png
  fileName: string;
  caption?: string; // Optional caption
}

export interface SendMediaResponse {
  success: boolean;
  messageId?: string; // Or whatever the actual response from Evolution API is
  error?: string;
}

/**
 * Invokes the 'evolution-api-handler' Supabase function to send a media message.
 */
export async function sendMediaService(params: SendMediaParams): Promise<SendMediaResponse> {
  const { instance, integrationId, number, media, mimetype, fileName, caption } = params;

  // The Supabase function 'evolution-api-handler' should be designed
  // to take these parameters and use the Evolution API MCP tool's 'send_media' function.
  const body = {
    action: 'send-media',
    instanceId: integrationId, // Pass the DB integration ID
    recipientJid: number,
    mediaData: media,
    mimeType: mimetype,
    filename: fileName,
    caption: caption,
  };

  try {
    const { data, error } = await supabase.functions.invoke<SendMediaResponse>('evolution-api-handler', { body });
    // Removed placeholder and simulation

    if (error) {
      console.error('Error invoking evolution-api-handler for send-media:', error);
      throw new Error(error.message || 'Failed to send media message via Supabase function.');
    }

    // Assuming the Supabase function returns a structure compatible with SendMediaResponse
    // or that it throws an error on failure.
    if (data && data.success) {
      return data;
    } else {
      // Handle cases where data might not be in expected success format but no error was thrown
      throw new Error(data?.error || 'Unknown error from evolution-api-handler for send-media.');
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error('Exception in sendMediaService:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
