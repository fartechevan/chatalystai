
import { SupabaseClient } from "@supabase/supabase-js"; // Use import map alias
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
      // Add logic to extract image caption or a placeholder for images
      if ('imageMessage' in message && typeof message.imageMessage === 'object' && message.imageMessage !== null) {
        const imageMessage = message.imageMessage as { 
          caption?: string; 
          mimetype?: string; 
          url?: string; 
          jpegThumbnail?: string; // Common for thumbnails
          // Potentially other fields if Evolution API sends full base64 for 'fromMe' messages
          media?: string; // If full base64 is sent under a 'media' key in imageMessage
        };

        // If 'media' field exists and looks like a data URI, prioritize it (for fromMe messages sent with base64)
        if (imageMessage.media && typeof imageMessage.media === 'string' && imageMessage.media.startsWith('data:image')) {
          return imageMessage.media;
        }
        // If 'url' field exists and looks like a data URI, use it
        if (imageMessage.url && typeof imageMessage.url === 'string' && imageMessage.url.startsWith('data:image')) {
          return imageMessage.url;
        }
        // If there's a caption, return that (even if it's an image, caption takes precedence for text content)
        if (imageMessage.caption && typeof imageMessage.caption === 'string') {
          return imageMessage.caption;
        }
        // Fallback for other image types or if no direct base64/caption is found
        return '[Image]'; // Placeholder indicating an image was received
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
 * @returns The webhook payload object containing event, instance, and data.
 * @throws Error if validation fails, JSON is invalid, or structure is wrong.
 */
export async function parseAndValidateWebhookRequest(req: Request): Promise<WebhookPayload> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let requestBody: Partial<WebhookPayload>; // Expect the payload directly
  try {
    requestBody = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON payload"); // Caught for 400
  }

  // Validate the direct structure
  if (!requestBody) {
    console.error("Invalid webhook structure received (empty body?):", requestBody);
    throw new Error("Invalid webhook structure: Empty request body");
  }

  // Destructure directly from the request body
  const { event, instance, data } = requestBody;

  if (!event || !instance) {
    console.error("Missing required fields in webhook payload:", requestBody);
    throw new Error("Missing required fields in payload: event or instance"); // Caught for 400
  }

  // Return the request body itself, cast to the expected interface
  // Ensure the WebhookPayload interface includes all necessary fields from the root level
  return requestBody as WebhookPayload;
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
