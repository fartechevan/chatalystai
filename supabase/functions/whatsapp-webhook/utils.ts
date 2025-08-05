// deno-lint-ignore-file
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { corsHeaders } from "../_shared/cors.ts";

// Type definitions
export interface WebhookPayload {
  event: string;
  instance: string;
  data: any;
}

export function extractMessageContent(data: any): string {
  if (data && data.message) {
    if (data.message.conversation) {
      return data.message.conversation;
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

export async function storeWebhookEventDb(supabase: SupabaseClient, payload: WebhookPayload): Promise<void> {
  const { event, instance, data } = payload;
  try {
    const { error } = await supabase.from('evolution_webhook_events').insert({
      event_type: event,
      payload: data,
      processing_status: 'received',
      source_identifier: instance,
    });
    if (error) {
      console.error(`Error storing webhook event (Instance: ${instance}, Event: ${event}):`, error);
    }
  } catch (dbError) {
    console.error(`Unexpected error storing webhook event (Instance: ${instance}, Event: ${event}):`, dbError);
  }
}
