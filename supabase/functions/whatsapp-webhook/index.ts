// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { parseAndValidateWebhookRequest, storeWebhookEventDb, createErrorResponse } from './utils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { handleMessageEvent } from './messageHandler.ts';

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

serve(async (req) => {
  const { url } = req;
  const urlParams = new URL(url).searchParams;
  const integrationConfigId = urlParams.get('config');

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

    storeWebhookEventDb(supabaseClient, payload).catch(err => console.error(`Background webhook event storage failed:`, err));

    let processingResult: true | string = true;
    if ((event === 'messages.upsert' || event === 'send.message' || event === 'messages.set') && data) {
      processingResult = await handleMessageEvent(supabaseClient, data as WhatsAppMessageData, instance, integrationConfigId);
    }

    const overallSuccess = processingResult === true;
    const responseBody = overallSuccess ? { success: true, processed: true } : { success: true, processed: false, error: `Main processing failed: ${processingResult}` };

    return new Response(JSON.stringify(responseBody), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return createErrorResponse(error, error.message.includes("Not Allowed") ? 405 : 400);
  }
});
