// deno-lint-ignore-file no-explicit-any
// @ts-ignore: Ignore TypeScript errors for Deno-specific modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Ignore TypeScript errors for Supabase modules
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { parseAndValidateWebhookRequest, storeWebhookEventDb, createErrorResponse, WebhookPayload } from './utils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { handleMessageEvent } from './messageHandler.ts';

// Define Request type to match Deno's serve function
type DenoRequest = Request;

interface WhatsAppMessageData {
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

serve(async (req: DenoRequest) => {
  const { url } = req;
  const urlParams = new URL(url).searchParams;
  const integrationConfigId = urlParams.get('config');

  // Log the incoming request with config ID for debugging
  console.log(`[WhatsApp Webhook] Received request with config ID: ${integrationConfigId || 'none'}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 });
  }

  try {
    const payload = await parseAndValidateWebhookRequest(req);
    const { event, instance, data } = payload;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Store webhook event with integration config ID for better tracking
    storeWebhookEventDb(supabaseClient, payload, integrationConfigId).catch(err => console.error(`Background webhook event storage failed:`, err));

    let processingResult: true | string = true;
    let eventId: string | null = null;

    // Get the stored event ID for status updates
    const { data: storedEvent } = await supabaseClient
      .from('evolution_webhook_events')
      .select('id')
      .eq('event_type', event)
      .eq('source_identifier', instance)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    eventId = storedEvent?.id || null;

    if ((event === 'messages.upsert' || event === 'send.message' || event === 'messages.set') && data) {
      processingResult = await handleMessageEvent(supabaseClient, data as WhatsAppMessageData, instance, integrationConfigId);
    }

    // Update processing status
    if (eventId) {
      const finalStatus = processingResult === true ? 'processed' : 'failed';
      await supabaseClient
        .from('evolution_webhook_events')
        .update({ processing_status: finalStatus })
        .eq('id', eventId);
    }

    const overallSuccess = processingResult === true;
    const responseBody = overallSuccess ? { success: true, processed: true } : { success: true, processed: false, error: `Main processing failed: ${processingResult}` };

    return new Response(JSON.stringify(responseBody), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: unknown) {
    // Type guard for error object
    if (error instanceof Error) {
      return createErrorResponse(error, error.message.includes("Not Allowed") ? 405 : 400);
    } else {
      // Handle case where error is not an Error object
      return createErrorResponse(new Error(String(error)), 400);
    }
  }
});
