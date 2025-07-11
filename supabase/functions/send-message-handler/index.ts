import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"; // Changed to direct URL import
import { Database } from "../_shared/database.types.ts";

export type MessageLogType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "template"
  | "interactive_buttons"
  | "interactive_list"
  | "location"
  | "contact"
  | "sticker"
  | "unknown";

interface SendMessageRequestBody {
  integration_config_id: string; // This is now the PK of integrations_config
  recipient_identifier: string;
  message_type: MessageLogType;
  message_content: string; // Text content or caption for media
  media_url?: string; // URL for media, if applicable
  // media_details is kept for potential future use or other integrations, but media_url will be prioritized for Evolution
  media_details?: {
    url: string; // This might be redundant if media_url is used
    mimetype: string;
    fileName?: string;
  };
  conversation_id?: string;
  sender_participant_id?: string;
  auth_user_id_override?: string; // For internal calls
}

interface ProviderResponse {
  success: boolean;
  provider_message_id?: string;
  error_message?: string;
}

interface EvolutionSendTextPayload {
  action: 'sendText';
  integrationConfigId: string; // This will be integrations_config.id
  number: string;
  text: string;
}

interface EvolutionSendMediaPayload {
  action: 'send-media';
  integrationConfigId: string; // This will be integrations_config.id
  recipientJid: string;
  mediaData: string;
  mimeType: string;
  filename: string;
  caption?: string;
}

type EvolutionPayloadType = EvolutionSendTextPayload | EvolutionSendMediaPayload;

serve(async (req: Request) => {
  console.log("[send-message-handler] Function execution started.");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient(req);
    const requestBody: SendMessageRequestBody = await req.json();
    const { auth_user_id_override } = requestBody;

    let userIdToUse: string | undefined;
    let userIsAuthenticated = false;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
      userIdToUse = user.id;
      userIsAuthenticated = true;
    } else if (auth_user_id_override && req.headers.get('x-internal-call') === 'supabase-functions-orchestrator') {
      // Allow override only if a specific internal call header is present
      // This header should be set by the calling function (e.g., whatsapp-webhook)
      console.log(`[send-message-handler] No user session, but auth_user_id_override provided by internal call: ${auth_user_id_override}`);
      userIdToUse = auth_user_id_override;
      userIsAuthenticated = true; // Trusting the internal call
    }

    if (!userIsAuthenticated || !userIdToUse) {
      console.error("[send-message-handler] Authentication failed. No user session and no valid override for internal call.");
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    // const requestBody: SendMessageRequestBody = await req.json(); // Moved up
    const {
      integration_config_id, // This is integrations_config.id (PK)
      recipient_identifier,
      message_type,
      message_content,
      media_url, // Added media_url
      media_details,
      conversation_id: request_conversation_id,
      sender_participant_id: request_sender_participant_id,
    } = requestBody;

    // Updated validation: message_content is required for text, optional for media (as caption)
    // media_url is required if message_type indicates media
    if (
      !integration_config_id ||
      !recipient_identifier ||
      !message_type ||
      (message_type === 'text' && !message_content) ||
      (['image', 'video', 'audio', 'document'].includes(message_type) && !media_url)
    ) {
      return new Response(JSON.stringify({ error: "Missing required fields. Check integration_config_id, recipient_identifier, message_type, message_content (for text), or media_url (for media)." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    const authUserId = userIdToUse; // Use the determined user ID

    console.log(`[send-message-handler] Using authUserId: ${authUserId}`);
    console.log(`Fetching integrations_config using its PK: ${integration_config_id}`);
    const { data: configData, error: configError } = await supabaseClient
      .from('integrations_config')
      .select(`
        id,
        instance_id,
        token,
        integration_id, 
        integrations (
          id,
          name,
          base_url,
          api_key
        )
      `)
      .eq('id', integration_config_id) // Query by the primary key of integrations_config
      .single();

    if (configError || !configData || !configData.integrations) {
      console.error("Error fetching integration config or its linked integration details:", configError, configData);
      return new Response(JSON.stringify({ error: "Integration configuration not found, or linked integration details are missing." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const baseIntegrationDetails = configData.integrations; 
    const actualIntegrationConfigId = configData.id; 
    
    // Logic to check baseIntegrationDetails.name for "Evolution API" is removed as per user feedback.
    // The function now assumes any config ID passed is intended for this handler's specific path (Evolution API).

    const billingEntityId = authUserId; 
    const billingEntityType = 'profile';

    console.log(`Billing entity: ${billingEntityType}, ID: ${billingEntityId}`);
    
    // Updated call to getActivePlanDetails, removed supabaseClient argument
    const { data: activePlanDetails, error: planError } = await getActivePlanDetails(authUserId);

    if (planError) {
      console.error(`Error fetching active plan for ${billingEntityType} ${billingEntityId}:`, planError.message);
      return new Response(JSON.stringify({ error: "Failed to retrieve active plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!activePlanDetails) {
      console.warn(`No active plan found for ${billingEntityType} ${billingEntityId}. Allowing message (no quota).`);
    }
    
    const messagesPerMonthLimit = activePlanDetails?.messages_per_month || null;
    const subscription_id = activePlanDetails?.subscription_id || null;
    console.log(`Active plan: ${activePlanDetails?.plan_name}, Subscription ID: ${subscription_id}, Limit: ${messagesPerMonthLimit ?? 'Unlimited'}`);
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let messagesSentThisCycle = 0;

    if (subscription_id && messagesPerMonthLimit !== null) {
      console.log(`Checking usage for subscription: ${subscription_id}, cycle: ${currentYear}-${currentMonth}`);
      const { data: usageData, error: usageError } = await supabaseClient
        .from('plan_message_usage')
        .select('messages_sent_this_cycle')
        .eq('subscription_id', subscription_id)
        .eq('billing_cycle_year', currentYear)
        .eq('billing_cycle_month', currentMonth)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error("Error fetching message usage:", usageError);
        return new Response(JSON.stringify({ error: "Failed to retrieve message usage." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
      messagesSentThisCycle = usageData?.messages_sent_this_cycle || 0;
      console.log(`Current usage: ${messagesSentThisCycle} / ${messagesPerMonthLimit}`);
    } else {
      console.log("Skipping usage fetch: No subscription with quota or no limit.");
    }

    if (messagesPerMonthLimit !== null && messagesSentThisCycle >= messagesPerMonthLimit) {
      console.log(`Quota exceeded for subscription: ${subscription_id}. Sent: ${messagesSentThisCycle}, Limit: ${messagesPerMonthLimit}`);
      return new Response(JSON.stringify({ error: "Monthly message quota exceeded." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    console.log("Logging message attempt as pending.");
    const { data: logEntry, error: initialLogError } = await supabaseClient
      .from("message_logs")
      .insert({
        profile_id: authUserId,
        integration_config_id: actualIntegrationConfigId,
        recipient_identifier: recipient_identifier,
        message_content: message_content, // Log the caption or text
        media_url: media_url || null, // Log the media_url
        media_details: media_details || null, // Keep for now, might be useful for other integrations
        message_type: message_type,
        status: "pending",
        direction: "outgoing",
      })
      .select()
      .single();

    if (initialLogError || !logEntry) {
      console.error("Error creating initial message log:", initialLogError);
      return new Response(JSON.stringify({ error: "Failed to log message attempt." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    const messageLogId = logEntry.id;

    const evolutionInstanceName = configData.instance_id; 
    const apiKey = baseIntegrationDetails.api_key || configData.token; 
    const baseUrl = baseIntegrationDetails.base_url;

    if (!evolutionInstanceName || !apiKey || !baseUrl) {
        console.error("Missing critical integration details for Evolution API call: instanceName, apiKey, or baseUrl.");
        await supabaseClient.from('message_logs').update({ status: 'failed', error_message: 'Internal server error: Missing integration credentials.' }).eq('id', messageLogId);
        return new Response(JSON.stringify({ error: "Internal server error: Missing integration credentials." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }

    let providerResponse: ProviderResponse | null = null; 

    // This function is now dedicated to handling Evolution API calls.
    // The client is responsible for ensuring the correct integration_config_id is sent.
    console.log(`Processing for provider: ${baseIntegrationDetails.name}, instance: ${evolutionInstanceName} via config ID: ${actualIntegrationConfigId}`);
    
    try {
      let evolutionPayload: EvolutionPayloadType;
      
      console.log(`[send-message-handler] Using integrations_config.id: ${actualIntegrationConfigId}`);

      if (message_type === 'text') {
        evolutionPayload = {
          action: 'sendText',
          integrationConfigId: actualIntegrationConfigId,
          number: recipient_identifier,
          text: message_content,
        };
      } else if (['image', 'video', 'audio', 'document'].includes(message_type) && media_url) {
        // Determine mimetype based on message_type if not explicitly provided in media_details
        // This is a basic mapping and might need to be more robust
        let mimeType = media_details?.mimetype;
        if (!mimeType) {
          if (message_type === 'image') mimeType = media_url.endsWith('.png') ? 'image/png' : 'image/jpeg'; // Basic assumption
          else if (message_type === 'video') mimeType = 'video/mp4';
          else if (message_type === 'audio') mimeType = 'audio/mp3'; // or ogg, etc.
          else if (message_type === 'document') mimeType = 'application/pdf'; // or other doc types
          // Add more specific mimetype detection if needed
        }
        if (!mimeType) {
           console.error(`Cannot determine mimetype for ${message_type} with URL ${media_url}`);
           providerResponse = { success: false, error_message: `Cannot determine mimetype for ${message_type}.` };
           await supabaseClient.from('message_logs').update({ status: 'failed', error_message: `Cannot determine mimetype for ${message_type}.` }).eq('id', messageLogId);
           return new Response(JSON.stringify(providerResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }

        evolutionPayload = {
          action: 'send-media',
          integrationConfigId: actualIntegrationConfigId,
          recipientJid: recipient_identifier,
          mediaData: media_url, // Use the direct media_url
          mimeType: mimeType,
          filename: media_details?.fileName || `${message_type}_${Date.now()}`, // Generate a filename if not provided
          caption: message_content, // Use message_content as caption
        };
      } else {
        console.error(`Invalid message_type (${message_type}) or missing media_url for media message.`);
        providerResponse = { success: false, error_message: "Invalid message data for media type or missing media URL." };
        await supabaseClient.from('message_logs').update({ status: 'failed', error_message: 'Invalid message data for media type or missing media URL.' }).eq('id', messageLogId);
        return new Response(JSON.stringify(providerResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      console.log("Calling evolution-api-handler with payload:", JSON.stringify(evolutionPayload, null, 2));
      const { data: evoFunctionResponse, error: evoFunctionError } = await supabaseClient.functions.invoke(
        'evolution-api-handler', 
        { body: evolutionPayload }
      );

      if (evoFunctionError) {
        console.error("Error invoking evolution-api-handler:", evoFunctionError);
        throw evoFunctionError; 
      }
      
      if (typeof evoFunctionResponse === 'object' && evoFunctionResponse !== null && 'success' in evoFunctionResponse) {
          providerResponse = evoFunctionResponse as ProviderResponse;
      } else {
          console.error("Unexpected response structure from evolution-api-handler:", evoFunctionResponse);
          providerResponse = { success: false, error_message: "Invalid response from messaging provider function." };
      }

    } catch (error) {
      console.error("Error invoking/simulating Evolution API handler:", error);
      providerResponse = { success: false, error_message: (error as Error).message || "Failed to call Evolution API handler" };
    }

    if (!providerResponse) {
        console.error("Provider response was not set after API call attempt.");
        providerResponse = { success: false, error_message: "Internal error: Provider response not set." };
    }

    if (providerResponse.success && providerResponse.provider_message_id) {
      console.log(`Message sent successfully. Provider ID: ${providerResponse.provider_message_id}`);
      await supabaseClient
        .from("message_logs")
        .update({
          status: "sent",
          provider_message_id: providerResponse.provider_message_id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", messageLogId);

      if (subscription_id && messagesPerMonthLimit !== null) {
        console.log(`Incrementing usage for subscription: ${subscription_id}, cycle: ${currentYear}-${currentMonth}`);
        const { error: rpcError } = await supabaseClient.rpc('increment_message_usage', {
          p_subscription_id: subscription_id,
          p_year: currentYear,
          p_month: currentMonth
        });
        if (rpcError) {
          console.error("Error incrementing message usage via RPC:", rpcError);
        } else {
          console.log("Successfully incremented message usage.");
        }
      } else {
        console.log("Skipping usage increment: No active subscription with quota or no limit.");
      }

      try {
        console.log("[send-message-handler] Attempting to log message to public.messages table.");
        const callingProfileId = authUserId;

        if (request_conversation_id && request_sender_participant_id) {
          console.log(`[send-message-handler] Using provided conversation_id: ${request_conversation_id} and sender_participant_id: ${request_sender_participant_id}`);
          const { error: messageInsertError } = await supabaseClient
            .from('messages')
            .insert({
              conversation_id: request_conversation_id,
              sender_participant_id: request_sender_participant_id,
              content: message_content,
              is_read: true, 
              wamid: providerResponse.provider_message_id
            });

          if (messageInsertError) {
            console.error('[send-message-handler] Error inserting into public.messages using provided IDs:', messageInsertError);
          } else {
            console.log('[send-message-handler] Message successfully logged in public.messages table using provided IDs.');
          }
        } else {
          console.log("[send-message-handler] conversation_id or sender_participant_id not provided in request. Attempting to find existing entities.");
          const { data: customer, error: customerError } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('phone_number', recipient_identifier)
            .single();

          if (customerError || !customer) {
            console.warn(`[send-message-handler] Customer with phone_number ${recipient_identifier} not found. Skipping message log in public.messages. Error:`, customerError);
          } else {
            const customerId = customer.id;
            console.log(`[send-message-handler] Found customer ID: ${customerId}`);

            const { data: conversationData, error: convError } = await supabaseClient
              .from('conversation_participants')
              .select(`
                  conversation_id,
                  id, 
                  customer_id,
                  external_user_identifier,
                  conversations (integrations_id)
              `)
              .eq('customer_id', customerId)
              .eq('conversations.integrations_id', baseIntegrationDetails.id) 
              .limit(1)
              .single();

            if (convError || !conversationData) {
              console.warn(`[send-message-handler] No existing conversation found for customer ${customerId} and integration ${baseIntegrationDetails.id}. Skipping message log in public.messages. Error:`, convError);
            } else {
              const conversationIdToLog = conversationData.conversation_id;
              console.log(`[send-message-handler] Found conversation ID: ${conversationIdToLog}`);

              const { data: senderParticipantData, error: senderError } = await supabaseClient
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conversationIdToLog)
                .eq('external_user_identifier', callingProfileId)
                .is('customer_id', null)
                .single();

              if (senderError || !senderParticipantData) {
                console.warn(`[send-message-handler] Sender participant not found for profile ${callingProfileId} in conversation ${conversationIdToLog}. Attempting to create one. Original find error:`, senderError);
                
                const { data: newSenderParticipant, error: createSenderError } = await supabaseClient
                  .from('conversation_participants')
                  .insert({
                    conversation_id: conversationIdToLog,
                    external_user_identifier: callingProfileId,
                    // customer_id is implicitly null for a non-customer participant
                  })
                  .select('id')
                  .single();

                if (createSenderError || !newSenderParticipant) {
                  console.error(`[send-message-handler] Failed to create sender participant for profile ${callingProfileId} in conversation ${conversationIdToLog}. Skipping message log in public.messages. Create error:`, createSenderError);
                } else {
                  const senderParticipantIdToLog = newSenderParticipant.id;
                  console.log(`[send-message-handler] Created and using new Sender Participant ID: ${senderParticipantIdToLog}`);
                  
                  const { error: messageInsertError } = await supabaseClient
                    .from('messages')
                    .insert({
                      conversation_id: conversationIdToLog,
                      sender_participant_id: senderParticipantIdToLog,
                      content: message_content, // Ensure message_content is defined in this scope
                      is_read: true, 
                      wamid: providerResponse.provider_message_id // Ensure providerResponse is defined
                    });

                  if (messageInsertError) {
                    console.error('[send-message-handler] Error inserting into public.messages after creating sender participant:', messageInsertError);
                  } else {
                    console.log('[send-message-handler] Message successfully logged in public.messages table after creating sender participant.');
                  }
                }
              } else {
                const senderParticipantIdToLog = senderParticipantData.id;
                console.log(`[send-message-handler] Found Sender Participant ID: ${senderParticipantIdToLog}`);

                const { error: messageInsertError } = await supabaseClient
                  .from('messages')
                  .insert({
                    conversation_id: conversationIdToLog,
                    sender_participant_id: senderParticipantIdToLog,
                    content: message_content, // Ensure message_content is defined
                    is_read: true, 
                    wamid: providerResponse.provider_message_id // Ensure providerResponse is defined
                  });

                if (messageInsertError) {
                  console.error('[send-message-handler] Error inserting into public.messages (fallback logic - found existing participant):', messageInsertError);
                } else {
                  console.log('[send-message-handler] Message successfully logged in public.messages table (fallback logic - found existing participant).');
                }
              }
            }
          }
        }
      } catch (messagesTableError) {
        console.error("[send-message-handler] Error during public.messages table update (custom logic):", messagesTableError);
      }

    } else {
      console.error(`Failed to send message: ${providerResponse?.error_message}`); 
      await supabaseClient
        .from("message_logs")
        .update({
          status: "failed",
          error_message: providerResponse?.error_message || "Unknown error from provider", 
        })
        .eq("id", messageLogId);
    }

    return new Response(JSON.stringify(providerResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: providerResponse?.success ? 200 : 500, 
    });

  } catch (error) {
    console.error("Unhandled error in send-message-handler:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

interface ActivePlanDetails {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  messages_per_month: number | null;
}

async function getActivePlanDetails( // supabaseClient parameter removed
  profileId: string | null
): Promise<{ data: ActivePlanDetails | null; error: Error | null }> {
  if (!profileId) {
    return { data: null, error: new Error("Profile ID must be provided to get active plan.") };
  }

  // Create a service role client for this specific operation
  const serviceRoleClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Call the RPC function
  const { data: rpcData, error: rpcError } = await serviceRoleClient.rpc(
    'get_active_subscription_details_for_profile',
    { profile_id_param: profileId }
  );

  if (rpcError) {
    console.error("Error calling get_active_subscription_details_for_profile RPC:", rpcError);
    return { data: null, error: rpcError };
  }

  // The RPC returns an array of rows, even if it's just one or zero.
  // We expect at most one row due to LIMIT 1 in the function.
  if (!rpcData || rpcData.length === 0) {
    console.log(`No active subscription found via RPC for profile_id: ${profileId}`);
    return { data: null, error: null };
  }

  // The RPC directly returns the fields we need.
  const subscriptionDetails = rpcData[0]; 

  return {
    data: {
      subscription_id: subscriptionDetails.subscription_id,
      plan_id: subscriptionDetails.plan_id,
      plan_name: subscriptionDetails.plan_name,
      messages_per_month: subscriptionDetails.messages_per_month,
    },
    error: null,
  };
}
