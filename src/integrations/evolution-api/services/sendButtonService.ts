import { supabase } from "@/integrations/supabase/client";

export interface SendButtonParams {
  instance: string; // Evolution Instance Name
  integrationId: string; // DB ID from integrations_config
  number: string; // Recipient JID (e.g., xxxxx@c.us)
  title: string; // Button message title
  description: string; // Button message description
  footer?: string; // Optional footer
  buttons: Array<{
    title: string; // Button title
    displayText: string; // Button display text
    id: string; // Button ID/value
  }>;
}

export interface SendButtonResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Invokes the 'evolution-api-handler' Supabase function to send a button message.
 */
export async function sendButtonService(params: SendButtonParams): Promise<SendButtonResponse> {
  const { instance, integrationId, number, title, description, footer, buttons } = params;

  const body = {
    action: 'send-buttons',
    integrationConfigId: integrationId,
    recipientJid: number,
    title: title,
    description: description,
    footer: footer,
    buttons: buttons,
  };

  try {
    const { data, error } = await supabase.functions.invoke<SendButtonResponse>('evolution-api-handler', { body });

    if (error) {
      console.error('Error invoking evolution-api-handler for send-buttons:', error);
      throw new Error(error.message || 'Failed to send button message via Supabase function.');
    }

    if (data && data.success) {
      return data;
    } else {
      throw new Error(data?.error || 'Unknown error from evolution-api-handler for send-buttons.');
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error('Exception in sendButtonService:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
