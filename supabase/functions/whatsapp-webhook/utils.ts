
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database, Json } from "../_shared/database.types.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Define the expected structure of the webhook payload
// Adjust based on actual Evolution API webhook structure
interface WebhookPayload {
  event: string;
  instance: string;
  data: unknown; // Use unknown for better type safety
  // Add other potential top-level fields
}

/**
 * Extracts the message content from various WhatsApp message types.
 * Uses type guards to safely access nested properties.
 */
export function extractMessageContent(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'object' && message !== null) {
      if ('conversation' in message && typeof message.conversation === 'string') {
        return message.conversation;
      }
      if ('extendedTextMessage' in message && typeof message.extendedTextMessage === 'object' && message.extendedTextMessage !== null && 'text' in message.extendedTextMessage && typeof message.extendedTextMessage.text === 'string') {
        return message.extendedTextMessage.text;
      }
    }
  }
  return 'Media or unknown message type'; // Fallback
}

/**
 * Creates an error response with proper headers
 */
export function createErrorResponse(error: Error, status = 500): Response {
  console.error('Error processing webhook:', error.message); // Log only message for brevity
  return new Response(
    JSON.stringify({ error: error.message }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  );
}

/**
 * Parses and validates the incoming webhook request.
 * Checks for POST method and required fields in the JSON body.
 *
 * @param req The incoming request object.
 * @returns The parsed webhook payload.
 * @throws Error if validation fails or JSON is invalid.
 */
export async function parseAndValidateWebhookRequest(req: Request): Promise<WebhookPayload> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<WebhookPayload>;
  try {
    // Clone request to log raw body if needed, then parse
    // const rawBody = await req.clone().text();
    // console.log("Raw webhook body:", rawBody);
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON payload"); // Caught for 400
  }

  const { event, instance, data } = body;

  if (!event || !instance) {
    throw new Error("Missing required fields: event or instance"); // Caught for 400
  }

  // Return the full payload, assuming structure matches WebhookPayload
  return body as WebhookPayload;
}

/**
 * Stores the raw webhook event in the database.
 * Logs errors but does not throw, allowing main processing to continue.
 *
 * @param supabase The Supabase client instance (Service Role recommended).
 * @param payload The full webhook payload.
 */
export async function storeWebhookEventDb(
    supabase: SupabaseClient<Database>,
    payload: WebhookPayload
): Promise<void> {
    const { event, instance } = payload;
    try {
        const { error } = await supabase
            .from('evolution_webhook_events')
            .insert({
                event_type: event,
                payload: payload as unknown as Json, // Cast payload to unknown then Json
                processing_status: 'received', // Initial status
                source_identifier: instance
            });

        if (error) {
            console.error(`Error storing webhook event (Instance: ${instance}, Event: ${event}):`, error);
        } else {
            console.log(`Stored webhook event: ${event} from instance ${instance}`);
        }
    } catch (dbError) {
        console.error(`Unexpected error storing webhook event (Instance: ${instance}, Event: ${event}):`, dbError);
    }
}
