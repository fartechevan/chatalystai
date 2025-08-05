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
  provider_message_id?: string;
  error_message?: string;
}

/**
 * Invokes the 'evolution-api-handler' Supabase function to send a button message.
 */
export async function sendButtonService(params: SendButtonParams): Promise<void> {
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

  console.log('sendButtonService: Calling evolution-api-handler with body:', JSON.stringify(body, null, 2));

  try {
    const { data, error } = await supabase.functions.invoke<SendButtonResponse>('evolution-api-handler', { body });

    if (error) {
      console.error('Error invoking evolution-api-handler for send-buttons:', error);
      throw new Error(error.message || 'Failed to send button message via Supabase function.');
    }

    console.log('sendButtonService: Received response from evolution-api-handler:', data);

    if (data && data.success) {
      console.log('sendButtonService: Button message sent successfully');
      return; // Success - no need to return anything for void function
    } else {
      const errorMsg = data?.error_message || 'Unknown error from evolution-api-handler for send-buttons.';
      console.error('sendButtonService: Button message failed:', errorMsg);
      throw new Error(errorMsg);
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error('Exception in sendButtonService:', errorMessage);
    throw e; // Re-throw the error so broadcast service can catch it
  }
}
