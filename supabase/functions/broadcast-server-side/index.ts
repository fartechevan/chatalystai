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
    .from('blacklist')
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
    .from('blacklist')
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
  
  if (media && mimetype && fileName) {
    // Determine message type based on mimetype
    let messageType = 'document'; // Default to document
    if (mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      messageType = 'audio';
    }
    
    // Prepare media data - now it's a file URL from Supabase Storage
    let mediaData = media;
    
    // Send media message
    payload = {
      integration_config_id: integrationConfigId,
      recipient_identifier: number,
      message_type: messageType,
      message_content: messageText, // Caption for media
      media_url: mediaData, // File URL from Supabase Storage
      media_details: {
        url: mediaData,
        mimetype: mimetype,
        fileName: fileName
      },
      auth_user_id_override: userId
    };
  } else {
    // Send regular text message
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
    throw new Error(`Evolution API call failed: ${response.status} ${errorText}`);
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
    
    // Validate required fields
    // messageText is optional if media is present
    const hasMessageText = messageText !== null && messageText !== undefined && messageText.trim() !== '';
    if (!targetMode || !integrationConfigId || !instanceId || !userId || (!hasMessageText && !media)) {
      console.log('Validation failed:', {
        targetMode: !!targetMode,
        integrationConfigId: !!integrationConfigId,
        instanceId: !!instanceId,
        userId: !!userId,
        messageText: messageText,
        hasMessageText: hasMessageText,
        media: !!media,
        hasMessageOrMedia: !!(messageText || media)
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: targetMode, messageText (or media), integrationConfigId, instanceId, userId' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Verify user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Validate target mode specific requirements
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
    
    let broadcastId: string;
    let validRecipients: RecipientInfo[] = [];
    
    // Create the broadcast record
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
    
    broadcastId = broadcastData.id;
    
    let validCustomers: CustomerInfo[] = [];
    
    if (targetMode === 'segment' && segmentId) {
      const { data: segmentContactsData, error: segmentContactsError } = await supabase
        .from('segment_contacts')
        .select(`customers ( id, phone_number )`)
        .eq('segment_id', segmentId);
      
      if (segmentContactsError) {
        console.error("Error fetching segment contacts:", segmentContactsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch segment contacts', details: segmentContactsError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      validCustomers = (segmentContactsData || [])
        .map((sc: any) => sc.customers)
        .filter((c: any): c is CustomerInfo => c !== null && typeof c.phone_number === 'string' && c.phone_number.trim() !== '');
      
    } else if (targetMode === 'customers' && customerIds && customerIds.length > 0) {
      const { data: customersData, error: customerError } = await supabase
        .from("customers")
        .select("id, phone_number")
        .in("id", customerIds);
      
      if (customerError) {
        console.error("Error fetching customers:", customerError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch customers', details: customerError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      validCustomers = (customersData || []).filter(
        (c: any): c is CustomerInfo => typeof c.phone_number === 'string' && c.phone_number.trim() !== ''
      );
    }
    
    if (targetMode === 'customers' || targetMode === 'segment') {
      if (validCustomers.length === 0) {
        console.warn("No valid recipients found for the broadcast target.");
        return new Response(
          JSON.stringify({ 
            success: true,
            data: { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      // Check customers against blacklist
      const blacklistResult = await checkCustomersAgainstBlacklist(supabase, validCustomers);
      const nonBlacklistedCustomers = blacklistResult.validCustomers;
      
      // Log blacklisted customers that will be skipped
      if (blacklistResult.blacklistedCustomers.length > 0) {
        console.log(`Skipping ${blacklistResult.blacklistedCustomers.length} blacklisted customers`);
      }
      
      if (nonBlacklistedCustomers.length === 0) {
        console.warn("All customers are blacklisted, no recipients to send to.");
        return new Response(
          JSON.stringify({ 
            success: true,
            data: { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      const recipientRecords = nonBlacklistedCustomers.map((c: CustomerInfo) => ({
        broadcast_id: broadcastId,
        customer_id: c.id,
        phone_number: c.phone_number,
        status: 'pending',
      }));
      
      const { data: insertedRecipients, error: recipientInsertError } = await supabase
        .from('broadcast_recipients')
        .insert(recipientRecords)
        .select('id, phone_number, customer_id');
      
      if (recipientInsertError) {
        console.error("Error inserting recipients:", recipientInsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create recipient records', details: recipientInsertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      validRecipients = (insertedRecipients || []).map((r: any) => ({
        id: r.customer_id,
        phone_number: r.phone_number,
        recipient_id: r.id
      }));
    }
    
    let successfulSends = 0;
    let failedSends = 0;
    let totalAttempted = 0;
    
    let numbersToSend: string[] = [];
    
    if (targetMode === 'csv' && phoneNumbers) {
      // Check phone numbers against blacklist for CSV mode
      const blacklistResult = await checkPhoneNumbersAgainstBlacklist(supabase, phoneNumbers);
      numbersToSend = blacklistResult.validPhoneNumbers;
      
      // Log blacklisted phone numbers that will be skipped
      if (blacklistResult.blacklistedPhoneNumbers.length > 0) {
        console.log(`Skipping ${blacklistResult.blacklistedPhoneNumbers.length} blacklisted phone numbers`);
      }
      
      if (numbersToSend.length === 0) {
        console.warn("All phone numbers are blacklisted, no recipients to send to.");
        return new Response(
          JSON.stringify({ 
            success: true,
            data: { broadcastId, successfulSends: 0, failedSends: 0, totalAttempted: 0 }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } else {
      numbersToSend = validRecipients.map((r: RecipientInfo) => r.phone_number);
    }
    
    totalAttempted = numbersToSend.length;
    
    const recipientRecordMap = new Map(validRecipients.map((r: RecipientInfo) => [r.phone_number, r.recipient_id]));
    
    for (const number of numbersToSend) {
      const recipientRecordId = recipientRecordMap.get(number);
      let updatePayload: { status: string; error_message?: string | null; sent_at?: string | null } = { 
        status: 'failed', 
        error_message: null, 
        sent_at: null 
      };
      
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
        updatePayload = { status: 'sent', sent_at: new Date().toISOString(), error_message: null };
      } catch (error: unknown) {
        failedSends++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        updatePayload = { status: 'failed', error_message: errorMessage, sent_at: null };
        console.error(`Failed to send to ${number}:`, errorMessage);
    }
    
    // Validate required fields
    // messageText is optional if media is present
    if (!targetMode || !integrationConfigId || !instanceId || !userId || (!messageText && !media)) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: targetMode, messageText (or media), integrationConfigId, instanceId, userId' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
        } catch (dbUpdateError) {
          console.error(`Database error updating status for recipient ${recipientRecordId}:`, dbUpdateError);
        }
      }
    }
    
    // Determine overall broadcast status
    let overallBroadcastStatus = 'pending';
    if (totalAttempted === 0) {
      overallBroadcastStatus = 'completed';
    } else if (successfulSends === totalAttempted) {
      overallBroadcastStatus = 'completed';
    } else if (failedSends === totalAttempted) {
      overallBroadcastStatus = 'failed';
    } else if (successfulSends > 0 && successfulSends < totalAttempted) {
      overallBroadcastStatus = 'partial_completion';
    }
    
    if (broadcastId) {
      try {
        const updatePayload = { 
          status: overallBroadcastStatus, 
          updated_at: new Date().toISOString() 
        };
        const { error: updateBroadcastError } = await supabase
          .from('broadcasts')
          .update(updatePayload)
          .eq('id', broadcastId);
        
        if (updateBroadcastError) {
          console.error(`Failed to update overall status for broadcast ${broadcastId}: ${updateBroadcastError.message}`);
        }
      } catch (dbUpdateError) {
        console.error(`Database error updating overall status for broadcast ${broadcastId}:`, dbUpdateError);
      }
    }
    
    const result: SendBroadcastServerSideResult = {
      broadcastId,
      successfulSends,
      failedSends,
      totalAttempted,
    };
    
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
