
import { corsHeaders } from "../_shared/cors.ts"

/**
 * Extracts the message content from various WhatsApp message types
 */
export function extractMessageContent(data: any): string {
  return data.message?.conversation || 
         data.message?.extendedTextMessage?.text || 
         'Media message';
}

/**
 * Creates an error response with proper headers
 */
export function createErrorResponse(error: Error, status = 500): Response {
  console.error('Error processing webhook:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  );
}
