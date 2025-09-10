// @deno-options --import-map=./deno.json
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts';
import { Database, Json } from '../_shared/database.types.ts';
import { OpenAI } from "openai";
import { extractAppointmentFromMessage, validateAppointmentForBooking, generateAppointmentConfirmation } from '../_shared/appointmentExtractor.ts';

// Define types based on database schema and expected payloads
type AIAgentDbRow = Database['public']['Tables']['ai_agents']['Row'];
type AgentChannelData = Database['public']['Tables']['ai_agent_channels']['Row'];

// Hardcoded system prompt for Chatalyst agents
const CHATALYST_SYSTEM_PROMPT = `You are a knowledgeable assistant for Chattalyst that can help with questions about our services and appointments.

IMPORTANT GUIDELINES:
1. Use the provided knowledge base content to answer questions about Chattalyst services, pricing, and features
2. If specific information isn't in the knowledge base, provide general helpful guidance and suggest contacting support
3. Be helpful, professional, and informative in your responses
4. You can help users book appointments when they request scheduling or meeting setup
5. You can also help users check their existing appointments and upcoming bookings
6. For appointment requests, ask for: type of appointment, preferred date and time
7. For appointment inquiries, you can retrieve and display their current appointments
8. Always prioritize being helpful while maintaining accuracy

When users ask about:
- Chattalyst pricing, plans, or features: Use the knowledge base to provide detailed information
- Booking appointments, scheduling, or setting up meetings: Help them book appointments and ask for necessary details
- Their current appointments, scheduled meetings, or upcoming bookings: Retrieve and display their appointment information
- Checking their calendar or appointment status: Show their existing appointments`;

// Payload for creating/updating a channel link
interface AgentChannelPayload {
  integrations_config_id: string;
  is_enabled_on_channel?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  keyword_trigger?: string | null;
  stop_keywords?: string[];
  session_timeout_minutes?: number;
  error_message?: string;
}

interface NewAgentPayload {
  name: string;
  knowledge_document_ids?: string[]; // Required for Chatalyst agents
  is_enabled?: boolean;
  agent_type?: 'chattalyst' | 'CustomAgent';
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
  commands?: Record<string, string>; // Key-value pairs for keyword-response mappings
  channels?: AgentChannelPayload[];
}

interface UpdateAgentPayload {
  name?: string;
  knowledge_document_ids?: string[];
  is_enabled?: boolean;
  agent_type?: 'chattalyst' | 'CustomAgent';
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
  commands?: Record<string, string>; // Key-value pairs for keyword-response mappings
  channels?: AgentChannelPayload[];
}

interface AgentWithDetails extends AIAgentDbRow { 
  knowledge_document_ids: string[];
  channels: AgentChannelData[];
}

// Explicit type for data to be inserted into ai_agents table
interface AgentForCreate {
  name: string;
  prompt: string;
  is_enabled: boolean;
  agent_type: string;
  custom_agent_config: Json | null;
  commands?: Json; // JSONB field for keyword-response mappings
  user_id: string;
  knowledge_document_ids?: string[];
}
// Explicit type for data to be used in updating ai_agents table
interface AgentForUpdate {
  name?: string;
  prompt?: string;
  is_enabled?: boolean;
  agent_type?: string;
  custom_agent_config?: Json | null;
  commands?: Json; // JSONB field for keyword-response mappings
  knowledge_document_ids?: string[];
}


function createJsonResponse(body: unknown, status: number = 200): Response {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = { ...corsHeaders } as Record<string, string>;
  if (status !== 204) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(responseBody, { status, headers });
}

// Validation function to check for channel conflicts
async function validateChannelConflicts(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  channelsToCheck: AgentChannelPayload[],
  excludeAgentId?: string
): Promise<{ hasConflicts: boolean; conflicts: Array<{ channel_id: string; agent_name: string; agent_id: string }> }> {
  if (!channelsToCheck || channelsToCheck.length === 0) {
    return { hasConflicts: false, conflicts: [] };
  }

  const enabledChannelIds = channelsToCheck
    .filter(channel => channel.is_enabled_on_channel !== false)
    .map(channel => channel.integrations_config_id);

  if (enabledChannelIds.length === 0) {
    return { hasConflicts: false, conflicts: [] };
  }

  let query = supabase
    .from('ai_agent_channels')
    .select(`
      integrations_config_id,
      agent_id,
      ai_agents!inner(name, is_enabled)
    `)
    .in('integrations_config_id', enabledChannelIds)
    .eq('is_enabled_on_channel', true)
    .eq('ai_agents.is_enabled', true);

  if (excludeAgentId) {
    query = query.neq('agent_id', excludeAgentId);
  }

  const { data: existingChannels, error } = await query;

  if (error) {
    console.error('Error checking channel conflicts:', error);
    throw new Error('Failed to validate channel conflicts');
  }

  const conflicts = (existingChannels || []).map((channel: { integrations_config_id: string; agent_id: string; ai_agents: { name: string; is_enabled: boolean | null } }) => ({
    channel_id: channel.integrations_config_id,
    agent_name: channel.ai_agents.name,
    agent_id: channel.agent_id
  }));

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

function detectAppointmentInquiry(message: string): boolean {
  const inquiryKeywords = [
    'my appointments', 'my bookings', 'scheduled appointments', 'upcoming appointments',
    'check appointments', 'view appointments', 'show appointments', 'list appointments',
    'appointment status', 'booking status', 'scheduled meetings', 'upcoming meetings',
    'my calendar', 'what appointments', 'when is my', 'appointment schedule',
    'booked appointments', 'reserved appointments', 'confirmed appointments'
  ];
  
  const lowerMessage = message.toLowerCase();
  return inquiryKeywords.some(keyword => lowerMessage.includes(keyword));
}

serve(async (req: Request) => {
  const initialRequestTime = Date.now();
  console.log(`[${initialRequestTime}] RAW REQUEST RECEIVED: ${req.method} ${req.url}, User-Agent: ${req.headers.get('User-Agent')}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${initialRequestTime}] Responding to OPTIONS request for ${req.url}`);
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  console.log(`[${requestStartTime}] Handling ${req.method} request for ${req.url}`);

  try {
    const isInternalCall = req.headers.get('X-Internal-Call') === 'true';
    const supabase = isInternalCall ? createSupabaseServiceRoleClient() : createSupabaseClient(req);
    
    let userId: string | undefined;
    if (!isInternalCall) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const functionNameIndex = pathSegments.indexOf('ai-agent-handler');
    const relevantPathSegments = functionNameIndex !== -1 ? pathSegments.slice(functionNameIndex + 1) : [];
    const agentIdFromPath = relevantPathSegments.length === 1 ? relevantPathSegments[0] : null;

    if (req.method === 'POST' && isInternalCall && !agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Internal Agent Query`);
      try {
        const body = await req.json();
        const { agentId, query, sessionId, contactIdentifier } = body;

        if (!agentId || !query || !sessionId || !contactIdentifier) {
          return createJsonResponse({ error: 'Missing required fields for internal agent query (agentId, query, sessionId, contactIdentifier)' }, 400);
        }

        console.log(`[${requestStartTime}] Internal Query: Using ${isInternalCall ? 'service role' : 'regular'} client`);
        console.log(`[${requestStartTime}] Internal Query: DB URL:`, Deno.env.get("SUPABASE_URL"));
        console.log(`[${requestStartTime}] Internal Query: Querying for agent ${agentId}`);
        
        // First try without .single() to see what we get
        const { data: allAgents, error: allAgentsError } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('id', agentId);
        
        console.log(`[${requestStartTime}] Internal Query: All agents query - count:`, allAgents?.length || 0, 'error:', allAgentsError?.message);
        
        const { data: agentData, error: agentFetchError } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('id', agentId)
          .single<AIAgentDbRow>();

        console.log(`[${requestStartTime}] Internal Query: Single query result - data:`, agentData ? 'found' : 'null', 'error:', agentFetchError?.message);
        console.log(`[${requestStartTime}] Internal Query: Agent data details:`, JSON.stringify(agentData, null, 2));
        console.log(`[${requestStartTime}] Internal Query: knowledge_document_ids specifically:`, agentData?.knowledge_document_ids);

        if (agentFetchError || !agentData) {
          console.error(`[${requestStartTime}] Internal Query: Agent ${agentId} not found. Error:`, agentFetchError?.message);
          return createJsonResponse({ error: `Agent not found: ${agentId}`, details: agentFetchError?.message }, 404);
        }
        
        // Handle missing agent_type in local database schema
        const agentType = agentData.agent_type || 'chattalyst';
        console.log(`[${requestStartTime}] Internal Query: Processing for agent ${agentData.name} (ID: ${agentId}), Type: ${agentType}`);

        let responseText: string | null = null;
        let imageUrl: string | null = null;
        let knowledgeUsed: unknown = null;

        if (agentType === 'chattalyst') {
          try {
            console.log(`[${requestStartTime}] Internal Query: Processing Chattalyst agent.`);
            const apiKey = Deno.env.get("OPENAI_API_KEY");
            if (!apiKey) {
              console.error(`[${requestStartTime}] Internal Query: OPENAI_API_KEY not set.`);
              throw new Error("OPENAI_API_KEY environment variable not set for internal query.");
            }
            const openai = new OpenAI({ apiKey });

            // Use knowledge_document_ids directly from the agent data
            const knowledgeDocumentIds = agentData.knowledge_document_ids || [];
            console.log(`[LOG] Agent ${agentId} has the following document IDs: ${JSON.stringify(knowledgeDocumentIds)}`);

            let contextText = "";
            let contextFound = false;

            if (knowledgeDocumentIds.length > 0) {
              console.log(`[LOG] Generating embedding for query: "${query}"`);
              const queryEmbedding = await generateEmbedding(query);
              console.log(`[LOG] Embedding generated successfully.`);

              console.log(`[LOG] Using semantic similarity search for knowledge chunks`)
              const { data: matchedChunks, error: matchError } = await supabase
                .rpc('match_knowledge_chunks_for_agent', {
                  p_query_embedding: queryEmbedding,
                  p_agent_id: agentId,
                  p_match_count: 10,
                  p_match_threshold: 0.001,
                  p_filter: null
                });
              
              console.log(`[LOG] Semantic search result - chunks found: ${matchedChunks?.length || 0}, error: ${matchError?.message || 'none'}`);
              if (matchedChunks && matchedChunks.length > 0) {
                console.log(`[LOG] First chunk similarity: ${matchedChunks[0].similarity}, content preview: ${matchedChunks[0].content?.substring(0, 100)}...`);
              }
              
              if (matchError) {
                console.error(`[LOG] Error matching chunks:`, matchError.message);
                // Fallback to direct query without similarity
                console.log(`[LOG] Falling back to direct query without similarity`);
                const { data: fallbackChunks, error: fallbackError } = await supabase
                  .from('knowledge_chunks')
                  .select(`
                    id,
                    content,
                    metadata,
                    embedding,
                    document_id,
                    knowledge_documents!inner(title)
                  `)
                  .in('document_id', knowledgeDocumentIds)
                  .eq('enabled', true)
                  .limit(5);
                
                if (!fallbackError && fallbackChunks && fallbackChunks.length > 0) {
                  contextFound = true;
                  contextText = fallbackChunks.map((chunk: { content: string }) => chunk.content).join("\n\n");
                  knowledgeUsed = fallbackChunks.map((chunk: { id: string; knowledge_documents: { title: string } }) => ({ id: chunk.id, title: chunk.knowledge_documents.title, similarity: 0.5 }));
                  console.log(`[LOG] Fallback: Found ${fallbackChunks.length} chunks. Context generated: ${contextText.substring(0, 100)}...`);
                }
              } else if (matchedChunks && matchedChunks.length > 0) {
                contextFound = true;
                contextText = matchedChunks.map((chunk: { content: string }) => chunk.content).join("\n\n");
                knowledgeUsed = matchedChunks.map((chunk: { id: string; document_title: string; similarity: number }) => ({ id: chunk.id, title: chunk.document_title, similarity: chunk.similarity }));
                console.log(`[LOG] Found ${matchedChunks.length} chunks with similarity search. Context generated: ${contextText.substring(0, 100)}...`);
              } else {
                console.log(`[LOG] No matching chunks found with similarity search.`);
              }
            } else {
              console.log(`[LOG] Agent has no knowledge documents linked.`);
            }
            
            const appointmentExtraction = await extractAppointmentFromMessage(query, contactIdentifier);
            const isAppointmentInquiry = detectAppointmentInquiry(query);
            
            if (isAppointmentInquiry && !appointmentExtraction.has_appointment_request) {
              console.log(`[${requestStartTime}] Internal Query: Appointment inquiry detected for contact ${contactIdentifier}.`);
              
              try {
                const appointmentResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/appointment-handler`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                    'X-Internal-Call': 'true'
                  },
                  body: JSON.stringify({
                    action: 'get',
                    contact_identifier: contactIdentifier,
                    limit: 10,
                    include_past: false
                  })
                });
                
                const appointmentResult = await appointmentResponse.json();
                
                if (appointmentResult.success && appointmentResult.appointments) {
                  const appointments = appointmentResult.appointments;
                    
                    if (appointments.length === 0) {
                      responseText = "You don't have any upcoming appointments scheduled. Would you like to book a new appointment?";
                    } else {
                      let appointmentList = "Here are your upcoming appointments:\n\n";
                      
                      appointments.forEach((apt: any, index: number) => {
                        const startDate = new Date(apt.start_time);
                        const formattedDate = startDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                        const formattedTime = startDate.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        
                        appointmentList += `${index + 1}. **${apt.title || 'Appointment'}**\n`;
                        appointmentList += `   📅 ${formattedDate}\n`;
                        appointmentList += `   🕐 ${formattedTime}\n`;
                        if (apt.notes) {
                          appointmentList += `   📝 ${apt.notes}\n`;
                        }
                        appointmentList += "\n";
                      });
                      
                      responseText = appointmentList;
                    }
                  } else {
                    console.error(`[${requestStartTime}] Internal Query: Failed to retrieve appointments:`, appointmentResult.error);
                    responseText = "I apologize, but I'm currently unable to retrieve your appointment information. Please try again later or contact us directly.";
                  }
                } catch (retrievalError) {
                  console.error(`[${requestStartTime}] Internal Query: Error calling appointment-handler for retrieval:`, retrievalError);
                  responseText = "I apologize, but I'm currently unable to access your appointment information. Please try again later.";
                }
            }
            else if (appointmentExtraction.has_appointment_request && appointmentExtraction.appointment) {
              console.log(`[${requestStartTime}] Internal Query: Appointment request detected with confidence ${appointmentExtraction.appointment.confidence}.`);
              
              const validation = validateAppointmentForBooking(appointmentExtraction.appointment);
              
              if (validation.is_valid) {
                console.log(`[${requestStartTime}] Internal Query: Booking appointment.`);
                try {
                  const bookingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/appointment-handler`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                      'X-Internal-Call': 'true'
                    },
                    body: JSON.stringify({
                      action: 'create',
                      title: appointmentExtraction.appointment.title,
                      start_time: appointmentExtraction.appointment.start_time,
                      end_time: appointmentExtraction.appointment.end_time,
                      contact_identifier: contactIdentifier,
                      notes: appointmentExtraction.appointment.notes,
                      source_channel: 'whatsapp',
                      agent_id: agentId,
                      session_id: sessionId
                    })
                  });
                  
                  const bookingResult = await bookingResponse.json();
                  
                  if (bookingResult.success) {
                    console.log(`[${requestStartTime}] Internal Query: Appointment booked successfully with ID ${bookingResult.appointment_id}.`);
                    responseText = generateAppointmentConfirmation(
                      appointmentExtraction.appointment,
                      bookingResult.appointment_id
                    );
                  } else {
                    console.error(`[${requestStartTime}] Internal Query: Failed to book appointment:`, bookingResult.error);
                    responseText = `I apologize, but I encountered an issue while booking your appointment: ${bookingResult.error ?? 'an unknown error'}. Please try again or contact us directly.`;
                  }
                } catch (bookingError) {
                  console.error(`[${requestStartTime}] Internal Query: Error calling appointment-handler function:`, bookingError);
                  responseText = "I apologize, but I'm currently unable to book appointments. Please try again later or contact us directly.";
                }
              } else {
                console.log(`[${requestStartTime}] Internal Query: Appointment request needs clarification. Missing: ${validation.missing_fields.join(', ')}.`);
                responseText = `I'd be happy to help you book an appointment! However, I need a bit more information:\n\n${validation.suggestions.join('\n')}\n\nPlease provide these details and I'll get your appointment scheduled right away.`;
              }
            } else if (appointmentExtraction.has_appointment_request) {
              console.log(`[${requestStartTime}] Internal Query: Low confidence appointment request detected.`);
              
              const appointmentContext = `\n\nAPPOINTMENT CONTEXT: The user has made an appointment request but with low confidence. Detected appointment details: ${JSON.stringify(appointmentExtraction.appointment || {})}. Please help clarify the appointment details and guide them through the booking process.`;
              
              const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { role: "system", content: CHATALYST_SYSTEM_PROMPT + appointmentContext },
              ];
              
              if (contextText) {
                messages.push({ role: "system", content: `KNOWLEDGE BASE CONTEXT:\n${contextText}\n\nUse this knowledge base information to provide helpful and accurate answers about Chattalyst services, pricing, and features.` });
              } else {
                messages.push({ role: "system", content: "No knowledge base context is available. Focus on helping with the appointment request using the appointment context provided." });
              }
              
              messages.push({ role: "user", content: query });
              
              console.log(`[${requestStartTime}] Internal Query: Calling OpenAI API for low confidence appointment.`);
              const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
              });
              responseText = completion.choices[0]?.message?.content?.trim() || appointmentExtraction.suggested_response || "I'd be happy to help you schedule an appointment. Could you please provide more details about what type of appointment you'd like and when you'd prefer to schedule it?";
            } else {
              console.log(`[${requestStartTime}] Internal Query: No appointment request detected, processing regular query.`);
              
              const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { role: "system", content: CHATALYST_SYSTEM_PROMPT },
              ];
              
              if (contextText) {
                messages.push({ role: "system", content: `KNOWLEDGE BASE CONTEXT:\n${contextText}\n\nUse this knowledge base information to provide helpful and accurate answers about Chattalyst services, pricing, and features.` });
              } else {
                messages.push({ role: "system", content: "No specific knowledge base context is available for this query. Provide general helpful guidance about Chattalyst services and suggest contacting support for detailed information." });
              }
              
              messages.push({ role: "user", content: query });
              
              console.log(`[${requestStartTime}] Internal Query: Calling OpenAI API.`);
              const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
              });
              responseText = completion.choices[0]?.message?.content?.trim() || null;
              console.log(`[${requestStartTime}] Internal Query: OpenAI API call successful. Response:`, responseText);
            }

          } catch (e) {
            const error = e as Error;
            console.error(`[${requestStartTime}] Internal Query: Error processing Chatalyst agent. Error: ${error.message}`);
            return createJsonResponse({ error: `Failed to process Chatalyst agent: ${error.message}` }, 500);
          }
        } else if (agentType === 'CustomAgent' && agentData.custom_agent_config && typeof agentData.custom_agent_config === 'object' && 'webhook_url' in agentData.custom_agent_config) {
          const webhookUrl = (agentData.custom_agent_config as { webhook_url: string }).webhook_url;
          console.log(`[${requestStartTime}] Internal Query: Forwarding to Custom Agent webhook: ${webhookUrl} for agent ${agentId}`);
          
          let processedContactIdentifier = contactIdentifier;
          if (contactIdentifier && contactIdentifier.endsWith('@s.whatsapp.net')) {
            processedContactIdentifier = contactIdentifier.substring(0, contactIdentifier.lastIndexOf('@s.whatsapp.net'));
            console.log(`[${requestStartTime}] Internal Query: Modified contactIdentifier from ${contactIdentifier} to ${processedContactIdentifier} for CustomAgent webhook.`);
          }

          const customAgentPayload = {
            message: query, 
            sessionId: sessionId,
            phone_number: processedContactIdentifier, 
            ...((agentData.custom_agent_config as { payload_template?: Record<string, unknown> }).payload_template || {})
          };

          const customAgentResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customAgentPayload),
          });

          if (!customAgentResponse.ok) {
            const errorText = await customAgentResponse.text();
            console.error(`[${requestStartTime}] Internal Query: Custom Agent webhook for agent ${agentId} returned error ${customAgentResponse.status}: ${errorText}`);
            responseText = "Sorry, I encountered an issue with the custom service.";
          } else {
            const responseBodyText = await customAgentResponse.text();
            console.log(`[${requestStartTime}] Internal Query: Custom Agent webhook for agent ${agentId} returned status ${customAgentResponse.status}. Raw response body: "${responseBodyText}"`);
            if (responseBodyText && responseBodyText.trim() !== "") {
              try {
                console.log(`[${requestStartTime}] Internal Query: Attempting to parse response body for agent ${agentId}.`);
                let parsedData = JSON.parse(responseBodyText);

                if (typeof parsedData === 'string') {
                  console.log(`[${requestStartTime}] Internal Query: Response body is a string, attempting to parse again.`);
                  parsedData = JSON.parse(parsedData);
                }
                
                responseText = parsedData.output || parsedData.response || parsedData.message || null;
                knowledgeUsed = parsedData.knowledge_used || null;
                imageUrl = parsedData.image || null;
                console.log(`[${requestStartTime}] Internal Query: Successfully parsed response for agent ${agentId}. Response text: ${responseText}, Image URL: ${imageUrl}`);
              } catch (parseError) {
                console.log(`[${requestStartTime}] Internal Query: Failed to parse response as JSON for agent ${agentId}. Treating raw body as response. Body: "${responseBodyText.substring(0, 500)}"...`);
                responseText = responseBodyText;
              }
            } else {
              console.warn(`[${requestStartTime}] Internal Query: Custom Agent webhook for agent ${agentId} returned an empty or whitespace-only response body.`);
              responseText = "Sorry, the custom service returned an empty response.";
            }
          }
        } else {
          console.warn(`[${requestStartTime}] Internal Query: Agent ${agentId} type ${agentType} not supported or webhook_url missing.`);
          responseText = "Sorry, this agent is not configured correctly.";
        }

        try {
          const userMessageLog = {
            session_id: sessionId,
            sender_type: 'user' as const,
            message_content: query,
            message_timestamp: new Date().toISOString(),
            knowledge_used: null,
            needs_review: true,
            added_to_knowledge_base: false
          };

          const { error: userLogError } = await supabase
            .from('agent_conversations')
            .insert(userMessageLog);

          if (userLogError) {
            console.error(`[${requestStartTime}] Failed to log user message:`, userLogError.message);
          } else {
            console.log(`[${requestStartTime}] Successfully logged user message for session ${sessionId}`);
          }

          if (responseText) {
            const agentMessageLog = {
              session_id: sessionId,
              sender_type: 'ai' as const,
              message_content: responseText,
              message_timestamp: new Date().toISOString(),
              knowledge_used: knowledgeUsed ? knowledgeUsed : null,
              needs_review: true,
              added_to_knowledge_base: false
            };

            const { error: agentLogError } = await supabase
              .from('agent_conversations')
              .insert(agentMessageLog);

            if (agentLogError) {
              console.error(`[${requestStartTime}] Failed to log agent response:`, agentLogError.message);
            } else {
              console.log(`[${requestStartTime}] Successfully logged agent response for session ${sessionId}`);
            }
          }
        } catch (loggingError) {
          console.error(`[${requestStartTime}] Error during conversation logging:`, (loggingError as Error).message);
        }

        return createJsonResponse({ response: responseText, image: imageUrl, knowledge_used: knowledgeUsed }, 200);

      } catch (e) {
        console.error(`[${requestStartTime}] Internal Query: Error processing internal agent query. Error: ${(e as Error).message}`);
        return createJsonResponse({ error: 'Failed to process internal agent query', details: (e as Error).message }, 500);
      }
    }
    
    if (req.method === 'POST' && !agentIdFromPath && !isInternalCall) {
      if (!userId) return createJsonResponse({ error: 'User authentication required for creating an agent' }, 401);
      console.log(`[${requestStartTime}] Routing to: Create Agent (REST)`);
      
      let payload: NewAgentPayload;
      try {
        payload = await req.json();
        
        if (payload.agent_type === 'chattalyst') {
          if (!payload.name) {
            return createJsonResponse({ error: 'Name is required for chattalyst agents' }, 400);
          }
          if (!payload.knowledge_document_ids || payload.knowledge_document_ids.length === 0) {
            return createJsonResponse({ error: 'At least one knowledge document must be linked for chattalyst agents' }, 400);
          }
        } else if (payload.agent_type === 'CustomAgent') {
          if (!payload.name || !payload.custom_agent_config?.webhook_url) {
            return createJsonResponse({ error: 'Name and webhook_url are required for CustomAgent agents' }, 400);
          }
        }
      } catch (jsonError) {
        return createJsonResponse({ error: 'Invalid payload for agent creation', details: (jsonError as Error).message }, 400);
      }

      const { knowledge_document_ids: knowledgeIdsToLink, channels: channelsToCreate, ...agentCorePayload } = payload;
      
      if (channelsToCreate && channelsToCreate.length > 0) {
        try {
          const { hasConflicts, conflicts } = await validateChannelConflicts(supabase, channelsToCreate);
          if (hasConflicts) {
            return createJsonResponse({
              error: 'Channel conflict detected',
              message: 'One or more selected channels are already linked to other agents. Please choose different channels or disable the conflicting agents first.',
              conflicts: conflicts.map(conflict => ({
                channel_id: conflict.channel_id,
                conflicting_agent: conflict.agent_name,
                agent_id: conflict.agent_id
              }))
            }, 409);
          }
        } catch (validationError) {
          console.error('Channel validation error:', validationError);
          return createJsonResponse({ error: 'Failed to validate channel conflicts', details: (validationError as Error).message }, 500);
        }
      }
      
      const agentToCreateData: AgentForCreate = {
        name: agentCorePayload.name,
        prompt: agentCorePayload.agent_type === 'CustomAgent' ? '' : CHATALYST_SYSTEM_PROMPT,
        is_enabled: agentCorePayload.is_enabled ?? true,
        agent_type: agentCorePayload.agent_type || 'chattalyst',
        custom_agent_config: (agentCorePayload.agent_type === 'CustomAgent' && agentCorePayload.custom_agent_config) ? agentCorePayload.custom_agent_config as Json : null,
        commands: agentCorePayload.commands ? agentCorePayload.commands as Json : null,
        user_id: userId!,
        knowledge_document_ids: knowledgeIdsToLink || [],
      };

      const { data: newAgent, error: agentInsertError } = await supabase
        .from('ai_agents').insert(agentToCreateData).select().single<AIAgentDbRow>();
      if (agentInsertError) {
        console.error("DB Insert Error:", agentInsertError); 
        return createJsonResponse({ error: 'Failed to create agent in database', details: agentInsertError.message }, 500);
      }
      if (!newAgent) return createJsonResponse({ error: 'Failed to create agent, no data returned after insert' }, 500);

      let createdChannels: AgentChannelData[] = [];
      if (channelsToCreate && channelsToCreate.length > 0) {
        const channelLinks = channelsToCreate.map(channel => ({
          agent_id: newAgent.id,
          integrations_config_id: channel.integrations_config_id,
          is_enabled_on_channel: channel.is_enabled_on_channel ?? true,
          activation_mode: channel.activation_mode || 'keyword',
          keyword_trigger: channel.keyword_trigger || null,
          stop_keywords: channel.stop_keywords || [],
          session_timeout_minutes: channel.session_timeout_minutes || 60,
          error_message: channel.error_message || 'Sorry, I can\'t help with that right now, we\'ll get in touch with you shortly.',
        }));
        const { data, error } = await supabase.from('ai_agent_channels').insert(channelLinks).select();
        if (error) {
          console.error("Error creating agent channels:", error);
          await supabase.from('ai_agents').delete().eq('id', newAgent.id);
          return createJsonResponse({ error: 'Failed to create agent channels', details: error.message }, 500);
        }
        createdChannels = data || [];
      }
      
      const responseAgent: AgentWithDetails = {
        ...newAgent,
        knowledge_document_ids: newAgent.knowledge_document_ids || [],
        channels: createdChannels,
      };
      return createJsonResponse({ agent: responseAgent }, 201);
    }
    else if (req.method === 'GET' && !agentIdFromPath) {
      // Since verify_jwt = false, we handle both authenticated and unauthenticated requests
      if (!userId) {
        console.log(`[${requestStartTime}] No user authentication, returning empty agent list`);
        return createJsonResponse({ agents: [] }, 200);
      }
      
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.warn(`[${requestStartTime}] Profile check failed for user ${userId}, returning empty agent list. Error:`, profileError);
        return createJsonResponse({ agents: [] }, 200);
      }
      
      console.log(`[${requestStartTime}] Routing to: List Agents (REST) - User ${userId} has a profile.`);
      const { data: agentsData, error: fetchAgentsError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', userId) 
        .order('created_at', { ascending: false });
      if (fetchAgentsError) return createJsonResponse({ error: 'Failed to fetch agents', details: fetchAgentsError.message }, 500);
      if (!agentsData) return createJsonResponse({ agents: [] }, 200);

      const agentIds = agentsData.map((a: AIAgentDbRow) => a.id);
      const { data: channelsData } = await supabase.from('ai_agent_channels').select('*').in('agent_id', agentIds);
      
      const channelsMap = new Map<string, AgentChannelData[]>();
      if (channelsData) {
        channelsData.forEach((channel: AgentChannelData) => {
          const existing = channelsMap.get(channel.agent_id) || [];
          channelsMap.set(channel.agent_id, [...existing, channel]);
        });
      }

      const agentsWithDetails: AgentWithDetails[] = agentsData.map((agent: AIAgentDbRow) => {
        const agentChannels = channelsMap.get(agent.id) || [];
        return {
          ...agent,
          channels: agentChannels,
          knowledge_document_ids: agent.knowledge_document_ids || [],
        };
      });
      return createJsonResponse({ agents: agentsWithDetails }, 200);
    }
    else if (req.method === 'GET' && agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error(`[${requestStartTime}] Profile check failed for user ${userId} when trying to get agent ${agentIdFromPath}:`, profileError);
        return createJsonResponse({ error: 'User profile not found or access denied.' }, 403);
      }
      
      console.log(`[${requestStartTime}] Routing to: Get Agent (REST - ID: ${agentIdFromPath}) - User ${userId} has a profile.`);
      const { data: agentData, error: agentFetchError } = await supabase
        .from('ai_agents').select('*').eq('id', agentIdFromPath).single<AIAgentDbRow>();
      if (agentFetchError) return createJsonResponse({ error: 'Agent not found', details: agentFetchError.message }, agentFetchError.code === 'PGRST116' ? 404 : 500);
      if (!agentData) return createJsonResponse({ error: 'Agent not found' }, 404);

      const { data: channelsData } = await supabase.from('ai_agent_channels').select('*').eq('agent_id', agentIdFromPath);
      
      const agentWithDetails: AgentWithDetails = {
        ...agentData,
        channels: channelsData || [],
        knowledge_document_ids: agentData.knowledge_document_ids || [],
      };
      return createJsonResponse({ agent: agentWithDetails }, 200);
    }
    else if ((req.method === 'PUT' || req.method === 'PATCH') && agentIdFromPath) {
      if (!userId) {
        console.error(`[${requestStartTime}] Update Agent: User authentication required for ID: ${agentIdFromPath}`);
        return createJsonResponse({ error: 'User authentication required' }, 401);
      }
      
      console.log(`[${requestStartTime}] Routing to: Update Agent (REST - ID: ${agentIdFromPath})`);
      console.log(`[${requestStartTime}] Update Agent: Attempting to parse JSON for ID: ${agentIdFromPath}. Content-Type: ${req.headers.get('Content-Type')}`);

      let payload: UpdateAgentPayload;
      try {
        const rawBody = await req.text();
        console.log(`[${requestStartTime}] Update Agent: Raw request body for ID ${agentIdFromPath}: ${rawBody.substring(0, 200)}...`);
        payload = JSON.parse(rawBody);
      } catch (e) {
        console.error(`[${requestStartTime}] Update Agent: Invalid JSON for update for ID ${agentIdFromPath}. Error: ${(e as Error).message}.`);
        return createJsonResponse({ error: 'Invalid JSON for update', details: (e as Error).message }, 400);
      }
      console.log(`[${requestStartTime}] Update Agent: Successfully parsed JSON payload for ID ${agentIdFromPath}`);

      const { knowledge_document_ids: knowledgeIdsToUpdate, channels: channelsToUpdate, ...agentCorePayload } = payload;
      
      const agentToUpdateData: AgentForUpdate = {};

      if (agentCorePayload.name !== undefined) agentToUpdateData.name = agentCorePayload.name;
      if (agentCorePayload.is_enabled !== undefined) agentToUpdateData.is_enabled = agentCorePayload.is_enabled;
      if (agentCorePayload.commands !== undefined) agentToUpdateData.commands = agentCorePayload.commands as Json;
      if (knowledgeIdsToUpdate !== undefined) {
        agentToUpdateData.knowledge_document_ids = knowledgeIdsToUpdate;
      }
      
      const agentTypeFromPayload = agentCorePayload.agent_type;

      if (agentTypeFromPayload) {
        agentToUpdateData.agent_type = agentTypeFromPayload;
        if (agentTypeFromPayload === 'chattalyst') {
          agentToUpdateData.custom_agent_config = null;
          if (knowledgeIdsToUpdate !== undefined && (!knowledgeIdsToUpdate || knowledgeIdsToUpdate.length === 0)) {
            return createJsonResponse({ error: 'At least one knowledge document must be linked for chattalyst agents' }, 400);
          }
        } else if (agentTypeFromPayload === 'CustomAgent') {
          agentToUpdateData.prompt = '';
          if (agentCorePayload.custom_agent_config !== undefined) { 
            agentToUpdateData.custom_agent_config = agentCorePayload.custom_agent_config as Json;
          } else {
            agentToUpdateData.custom_agent_config = null; 
          }
        }
      }

      console.log(`[${requestStartTime}] Update Agent: User ID for update: ${userId}`);
      console.log(`[${requestStartTime}] Update Agent: Data to be updated for agent ${agentIdFromPath}:`, JSON.stringify(agentToUpdateData, null, 2));

      let updatedAgent: AIAgentDbRow | null = null;
      if (Object.keys(agentToUpdateData).length > 0) {
        const { data, error } = await supabase.from('ai_agents').update(agentToUpdateData)
          .eq('id', agentIdFromPath).eq('user_id', userId!).select().single<AIAgentDbRow>();
        if (error) {
          console.error("DB Update Error:", error); 
          return createJsonResponse({ error: 'Failed to update agent in database', details: error.message }, error.code === 'PGRST116' ? 404 : 500);
        }
        updatedAgent = data;
      } else { 
        const { data, error } = await supabase.from('ai_agents').select('*').eq('id', agentIdFromPath).eq('user_id', userId!).single<AIAgentDbRow>();
        if (error || !data) return createJsonResponse({ error: 'Agent not found for update', details: error?.message }, 404);
        updatedAgent = data;
      }
      if (!updatedAgent) return createJsonResponse({ error: 'Agent not found or update failed' }, 404);

      if (channelsToUpdate !== undefined) {
        console.log(`[${requestStartTime}] Updating channels for agent ${agentIdFromPath}:`, JSON.stringify(channelsToUpdate, null, 2));
        
        if (channelsToUpdate && channelsToUpdate.length > 0) {
          try {
            const { hasConflicts, conflicts } = await validateChannelConflicts(supabase, channelsToUpdate, agentIdFromPath);
            if (hasConflicts) {
              return createJsonResponse({
                error: 'Channel conflict detected',
                message: 'One or more selected channels are already linked to other agents. Please choose different channels or disable the conflicting agents first.',
                conflicts: conflicts.map(conflict => ({
                  channel_id: conflict.channel_id,
                  conflicting_agent: conflict.agent_name,
                  agent_id: conflict.agent_id
                }))
              }, 409);
            }
          } catch (validationError) {
            console.error('Channel validation error:', validationError);
            return createJsonResponse({ error: 'Failed to validate channel conflicts', details: (validationError as Error).message }, 500);
          }
        }
        
        const { error: deleteError } = await supabase.from('ai_agent_channels').delete().eq('agent_id', agentIdFromPath);
        if (deleteError) {
          console.error(`[${requestStartTime}] Error deleting old channels for agent ${agentIdFromPath}:`, deleteError.message);
        }
        if (channelsToUpdate && channelsToUpdate.length > 0) {
          const channelLinks = channelsToUpdate.map(channel => ({
            agent_id: agentIdFromPath,
            integrations_config_id: channel.integrations_config_id,
            is_enabled_on_channel: channel.is_enabled_on_channel ?? true,
            activation_mode: channel.activation_mode || 'keyword',
            keyword_trigger: channel.keyword_trigger || null,
            stop_keywords: channel.stop_keywords || [],
            session_timeout_minutes: channel.session_timeout_minutes || 60,
            error_message: channel.error_message || 'Sorry, I can\'t help with that right now, we\'ll get in touch with you shortly.',
          }));
          console.log(`[${requestStartTime}] Inserting new channels for agent ${agentIdFromPath}:`, JSON.stringify(channelLinks, null, 2));
          const { error: insertError } = await supabase.from('ai_agent_channels').insert(channelLinks);
          if (insertError) {
            console.error(`[${requestStartTime}] Error inserting new channels for agent ${agentIdFromPath}:`, insertError.message);
          }
        }
      }
      
      const { data: finalChannels } = await supabase.from('ai_agent_channels').select('*').eq('agent_id', agentIdFromPath);

      const responseAgent: AgentWithDetails = {
        ...updatedAgent, 
        channels: finalChannels || [],
        knowledge_document_ids: (updatedAgent as AIAgentDbRow).knowledge_document_ids || []
      };
      return createJsonResponse({ agent: responseAgent }, 200);
    }
    else if (req.method === 'DELETE' && agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      
      console.log(`[${requestStartTime}] Routing to: Delete Agent (REST - ID: ${agentIdFromPath})`);

      const { data: agent, error: fetchError } = await supabase
        .from('ai_agents')
        .select('id')
        .eq('id', agentIdFromPath)
        .eq('user_id', userId)
        .single();

      if (fetchError || !agent) {
        return createJsonResponse({ error: 'Agent not found or access denied.' }, 404);
      }

      await supabase.from('ai_agent_channels').delete().eq('agent_id', agentIdFromPath);

      const { error } = await supabase.from('ai_agents').delete().eq('id', agentIdFromPath).eq('user_id', userId);

      if (error) {
        console.error(`[${requestStartTime}] Error deleting agent ${agentIdFromPath}:`, error.message);
        return createJsonResponse({ error: 'Failed to delete agent', details: error.message }, 500);
      }

      console.log(`[${requestStartTime}] Successfully deleted agent ${agentIdFromPath} and its relations.`);
      return createJsonResponse(null, 204);
    }
    else {
      return createJsonResponse({ error: 'Method Not Allowed or Invalid Route' }, 405);
    }

  } catch (error) {
    console.error(`[${requestStartTime}] Unhandled Top-Level Error:`, (error as Error).message, (error as Error).stack);
    return createJsonResponse({ error: 'Internal server error', details: (error as Error).message }, 500);
  } finally {
    const requestEndTime = Date.now();
    console.log(`[${requestStartTime}] Request finished in ${requestEndTime - requestStartTime}ms`);
  }
});
