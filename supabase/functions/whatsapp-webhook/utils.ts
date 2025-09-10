// deno-lint-ignore-file no-explicit-any
// @ts-ignore: Ignore TypeScript errors for Supabase modules
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { corsHeaders } from "../_shared/cors.ts";

// Type definitions
export interface WebhookPayload {
  event: string;
  instance: string;
  data: WhatsAppMessageData;
}

export interface WhatsAppMessageData {
  key: {
    remoteJid: string;
    fromMe?: boolean;
    id: string;
  };
  pushName?: string;
  message?: any;
  messageType?: string;
  messageTimestamp?: number;
}

export function extractMessageContent(data: WhatsAppMessageData): string {
  if (data && data.message) {
    if (typeof data.message === 'string') {
      return data.message;
    }
    if (data.message.conversation) {
      return data.message.conversation;
    }
    if (data.message.text) {
      return data.message.text;
    }
    if (data.message.extendedTextMessage && data.message.extendedTextMessage.text) {
      return data.message.extendedTextMessage.text;
    }
    if (data.message.imageMessage && data.message.imageMessage.caption) {
      return data.message.imageMessage.caption;
    }
    if (data.message.videoMessage && data.message.videoMessage.caption) {
        return data.message.videoMessage.caption;
    }
    if (data.message.documentMessage && (data.message.documentMessage.caption || data.message.documentMessage.title || data.message.documentMessage.fileName)) {
        return data.message.documentMessage.caption || data.message.documentMessage.title || data.message.documentMessage.fileName;
    }
    if (data.messageType === 'imageMessage') return '[Image]';
  }
  return 'Media or unknown message type';
}

export function createErrorResponse(error: Error, status = 500): Response {
  return new Response(JSON.stringify({ error: error.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

export async function parseAndValidateWebhookRequest(req: Request): Promise<WebhookPayload> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed");
  }
  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON payload");
  }
  if (!requestBody || !requestBody.event || !requestBody.instance) {
    throw new Error("Missing required fields: event or instance");
  }
  return requestBody as WebhookPayload;
}

export async function storeWebhookEventDb(supabase: SupabaseClient, payload: WebhookPayload, integrationConfigId?: string | null): Promise<void> {
  const { event, instance, data } = payload;
  try {
    // Create the base record data
    const recordData: any = {
      event_type: event,
      payload: data,
      processing_status: 'received',
      source_identifier: instance,
    };

    // Add integration_config_id if provided
    if (integrationConfigId) {
      // First check if the column exists to avoid errors
      try {
        // Try to add the integration_config_id to the record
        recordData.integration_config_id = integrationConfigId;
        console.log(`[storeWebhookEventDb] Attempting to store event with integration_config_id: ${integrationConfigId}`);
        
        const { error } = await supabase.from('evolution_webhook_events').insert(recordData);
        if (error) {
          // If there's an error, it might be because the column doesn't exist yet
          if (error.message && error.message.includes('column "integration_config_id" of relation "evolution_webhook_events" does not exist')) {
            console.warn(`[storeWebhookEventDb] The integration_config_id column doesn't exist yet. Storing without it.`);
            // Remove the integration_config_id and try again
            delete recordData.integration_config_id;
            const { error: retryError } = await supabase.from('evolution_webhook_events').insert(recordData);
            if (retryError) {
              console.error(`[storeWebhookEventDb] Error on retry: ${retryError.message}`);
            }
          } else {
            console.error(`Error storing webhook event (Instance: ${instance}, Event: ${event}, ConfigID: ${integrationConfigId || 'none'}):`, error);
          }
        }
      } catch (columnError) {
        // If there's an error with the column, fall back to storing without it
        console.warn(`[storeWebhookEventDb] Error with integration_config_id, storing without it:`, columnError);
        delete recordData.integration_config_id;
        const { error } = await supabase.from('evolution_webhook_events').insert(recordData);
        if (error) {
          console.error(`Error storing webhook event without config ID:`, error);
        }
      }
    } else {
      // No integration_config_id provided, just insert the record
      const { error } = await supabase.from('evolution_webhook_events').insert(recordData);
      if (error) {
        console.error(`Error storing webhook event (Instance: ${instance}, Event: ${event}):`, error);
      }
    }
  } catch (dbError) {
    console.error(`Unexpected error storing webhook event (Instance: ${instance}, Event: ${event}, ConfigID: ${integrationConfigId || 'none'}):`, dbError);
  }
}

export async function updateWebhookEventStatus(
  supabase: SupabaseClient, 
  eventId: string, 
  status: 'processed' | 'failed' | 'pending'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('evolution_webhook_events')
      .update({ processing_status: status })
      .eq('id', eventId);
    
    if (error) {
      console.error(`Error updating webhook event status:`, error);
    }
  } catch (dbError) {
    console.error(`Unexpected error updating webhook event status:`, dbError);
  }
}
