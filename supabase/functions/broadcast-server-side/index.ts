import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { fetchIntegrationCredentialsById } from "../_shared/integrationUtils.ts";

interface CustomerInfo {
  id: string;
  phone_number: string;
}

interface RecipientInfo extends CustomerInfo {
  recipient_id: string;
}

interface SendBroadcastServerSideParams {
  targetMode: 'customers' | 'segment' | 'csv';
  customerIds?: string[];
  segmentId?: string;
  phoneNumbers?: string[];
  messageText: string;
  integrationConfigId: string;
  instanceId: string;
  media?: string;
  mimetype?: string;
  fileName?: string;
  imageUrl?: string;
  includeOptOutButton?: boolean;
  userId: string;
}

interface SendBroadcastServerSideResult {
  broadcastId: string;
  successfulSends: number;
  failedSends: number;
  totalAttempted: number;
}

// Helper function to check customers against blacklist
async function checkCustomersAgainstBlacklist(supabase: any, customers: CustomerInfo[]) {
  const phoneNumbers = customers.map(c => c.phone_number);
  
  const { data: blacklistedData, error } = await supabase
    .from('blacklisted_customers')
    .select('phone_number')
    .in('phone_number', phoneNumbers);
    
  if (error) {
    console.error('Error checking blacklist:', error);
    return { validCustomers: customers, blacklistedCustomers: [] };
  }
  
  const blacklistedNumbers = new Set((blacklistedData || []).map((b: any) => b.phone_number));
  
  const validCustomers = customers.filter(c => !blacklistedNumbers.has(c.phone_number));
  const blacklistedCustomers = customers.filter(c => blacklistedNumbers.has(c.phone_number));
  
  return { validCustomers, blacklistedCustomers };
}

// Helper function to check phone numbers against blacklist
async function checkPhoneNumbersAgainstBlacklist(supabase: any, phoneNumbers: string[]) {
  const { data: blacklistedData, error } = await supabase
    .from('blacklisted_customers')
    .select('phone_number')
    .in('phone_number', phoneNumbers);
    
  if (error) {
    console.error('Error checking blacklist:', error);
    return { validPhoneNumbers: phoneNumbers, blacklistedPhoneNumbers: [] };
  }
  
  const blacklistedNumbers = new Set((blacklistedData || []).map((b: any) => b.phone_number));
  
  const validPhoneNumbers = phoneNumbers.filter(num => !blacklistedNumbers.has(num));
  const blacklistedPhoneNumbers = phoneNumbers.filter(num => blacklistedNumbers.has(num));
  
  return { validPhoneNumbers, blacklistedPhoneNumbers };
}

// Helper function to send messages via Evolution API
async function sendMessage(params: {
  instanceId: string;
  integrationConfigId: string;
  number: string;
  messageText: string;
  media?: string;
  mimetype?: string;
  fileName?: string;
  includeOptOutButton?: boolean;
  userId: string;
}) {
  const { instanceId, integrationConfigId, number, messageText, media, mimetype, fileName, includeOptOutButton, userId } = params;
  
  // Call the send-message-handler edge function
  const sendMessageUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-message-handler`;
  
  let payload: any;
  
  if (media) {
    // This is a media message
    let messageType = 'document'; // Default to document
    if (mimetype?.startsWith('image/')) {
      messageType = 'image';
    } else if (mimetype?.startsWith('video/')) {
      messageType = 'video';
    } else if (mimetype?.startsWith('audio/')) {
      messageType = 'audio';
    }
    
    payload = {
      integration_config_id: integrationConfigId,
      recipient_identifier: number,
      message_type: messageType,
      message_content: messageText, // Caption for media
      media_url: media, // File URL from Supabase Storage
      auth_user_id_override: userId
    };

    // Conditionally add media_details if mimetype is available
    if (mimetype) {
      payload.media_details = {
        url: media,
        mimetype: mimetype,
        fileName: fileName // fileName can be undefined, which is fine
      };
    }

  } else {
    // This is a regular text message
    payload = {
      integration_config_id: integrationConfigId,
      recipient_identifier: number,
      message_type: 'text',
      message_content: messageText,
      auth_user_id_override: userId
    };
  }
  
  const response = await fetch(sendMessageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'x-internal-call': 'supabase-functions-orchestrator'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    // Throwing an error here will be caught by the main loop and logged per-recipient
    throw new Error(`Send message failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }
  
  try {
    const params: SendBroadcastServerSideParams = await req.json();
    const {
      targetMode,
      customerIds,
      segmentId,
      phoneNumbers,
      messageText,
      integrationConfigId,
      instanceId,
      media,
      mimetype,
      fileName,
      imageUrl,
      includeOptOutButton = false,
      userId
    } = params;
    
    const hasMessageText = messageText !== null && messageText !== undefined && messageText.trim() !== '';
    if (!targetMode || !integrationConfigId || !instanceId || !userId || (!hasMessageText && !media)) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: targetMode, messageText (or media), integrationConfigId, instanceId, userId' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    if (targetMode === 'customers' && (!customerIds || customerIds.length === 0)) {
      return new Response(
        JSON.stringify({ error: "customerIds must be provided for 'customers' target mode." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (targetMode === 'segment' && !segmentId) {
      return new Response(
        JSON.stringify({ error: "segmentId must be provided for 'segment' target mode." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (targetMode === 'csv' && (!phoneNumbers || phoneNumbers.length === 0)) {
      return new Response(
        JSON.stringify({ error: "phoneNumbers must be provided for 'csv' target mode." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const insertPayload: any = {
      message_text: messageText,
      integration_config_id: integrationConfigId,
      instance_id: instanceId,
    };
    if (targetMode === 'segment' && segmentId) {
      insertPayload.segment_id = segmentId;
    }
    
    const { data: broadcastData, error: broadcastInsertError } = await supabase
      .from('broadcasts')
      .insert(insertPayload)
      .select('id')
      .single();
    
    if (broadcastInsertError) {
      console.error("Error inserting into broadcasts table:", broadcastInsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create broadcast record', details: broadcastInsertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const broadcastId = broadcastData.id;
    let validRecipients: RecipientInfo[] = [];
    let validCustomers: CustomerInfo[] = [];
    
    if (targetMode === 'segment' && segmentId) {
      const { data, error } = await supabase
        .from('segment_contacts')
        .select(`customers ( id, phone_number )`)
        .eq('segment_id', segmentId);
      if (error) throw new Error(`Failed to fetch segment contacts: ${error.message}`);
      validCustomers = (data || []).map((sc: any) => sc.customers).filter(Boolean);
    } else if (targetMode === 'customers' && customerIds) {
      const { data, error } = await supabase.from("customers").select("id, phone_number").in("id", customerIds);
      if (error) throw new Error(`Failed to fetch customers: ${error.message}`);
      validCustomers = data || [];
    }
    
    if (['customers', 'segment'].includes(targetMode)) {
      const { validCustomers: nonBlacklisted, blacklistedCustomers } = await checkCustomersAgainstBlacklist(supabase, validCustomers);
      if (blacklistedCustomers.length > 0) console.log(`Skipping ${blacklistedCustomers.length} blacklisted customers`);
      
      if (nonBlacklisted.length > 0) {
        const recipientRecords = nonBlacklisted.map(c => ({
          broadcast_id: broadcastId,
          customer_id: c.id,
          phone_number: c.phone_number,
          status: 'pending',
        }));
        const { data, error } = await supabase.from('broadcast_recipients').insert(recipientRecords).select('id, phone_number, customer_id');
        if (error) throw new Error(`Failed to create recipient records: ${error.message}`);
        validRecipients = (data || []).map((r: { customer_id: string; phone_number: string; id: string }) => ({ id: r.customer_id, phone_number: r.phone_number, recipient_id: r.id }));
      }
    }
    
    let numbersToSend: string[] = [];
    if (targetMode === 'csv' && phoneNumbers) {
      const { validPhoneNumbers, blacklistedPhoneNumbers } = await checkPhoneNumbersAgainstBlacklist(supabase, phoneNumbers);
      if (blacklistedPhoneNumbers.length > 0) console.log(`Skipping ${blacklistedPhoneNumbers.length} blacklisted phone numbers`);
      numbersToSend = validPhoneNumbers;
    } else {
      numbersToSend = validRecipients.map(r => r.phone_number);
    }
    
    if (numbersToSend.length === 0) {
      console.warn("No valid recipients to send to after filtering.");
    }

    let successfulSends = 0;
    let failedSends = 0;
    const totalAttempted = numbersToSend.length;
    const recipientRecordMap = new Map(validRecipients.map(r => [r.phone_number, r.recipient_id]));

    for (const number of numbersToSend) {
      const recipientRecordId = recipientRecordMap.get(number);
      let statusUpdate: { status: string; error_message?: string | null; sent_at?: string | null } = { status: 'failed' };

      try {
        await sendMessage({
          instanceId,
          integrationConfigId,
          number,
          messageText,
          media,
          mimetype,
          fileName,
          includeOptOutButton,
          userId
        });
        successfulSends++;
        statusUpdate = { status: 'sent', sent_at: new Date().toISOString(), error_message: null };
      } catch (error: unknown) {
        failedSends++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        statusUpdate = { status: 'failed', error_message: errorMessage };
        console.error(`Failed to send to ${number}:`, errorMessage);
      }

      if (recipientRecordId) {
        try {
          await supabase.from('broadcast_recipients').update(statusUpdate).eq('id', recipientRecordId);
        } catch (dbUpdateError) {
          console.error(`Database error updating status for recipient ${recipientRecordId}:`, dbUpdateError);
        }
      }
    }
    
    let overallBroadcastStatus = 'completed';
    if (totalAttempted > 0) {
      if (failedSends === totalAttempted) overallBroadcastStatus = 'failed';
      else if (failedSends > 0) overallBroadcastStatus = 'partial_completion';
    }
    
    await supabase.from('broadcasts').update({ status: overallBroadcastStatus, updated_at: new Date().toISOString() }).eq('id', broadcastId);
    
    const result: SendBroadcastServerSideResult = { broadcastId, successfulSends, failedSends, totalAttempted };
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Server-side broadcast error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
