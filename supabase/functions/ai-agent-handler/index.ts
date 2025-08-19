// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';
import OpenAI from "openai"; // Use mapped import from import_map.json

// Define types based on database schema and expected payloads
type AIAgentDbRow = Database['public']['Tables']['ai_agents']['Row'];
type AgentChannelData = Database['public']['Tables']['ai_agent_channels']['Row'];

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
  prompt?: string;
  knowledge_document_ids?: string[];
  is_enabled?: boolean;
  agent_type?: 'chattalyst' | 'CustomAgent';
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
  // Channels are now a separate part of the payload
  channels?: AgentChannelPayload[];
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  knowledge_document_ids?: string[];
  is_enabled?: boolean;
  agent_type?: 'chattalyst' | 'CustomAgent';
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
  // Channels are updated as a whole array
  channels?: AgentChannelPayload[];
}

interface AgentWithDetails extends AIAgentDbRow { 
  knowledge_document_ids: string[];
  // Instead of flat IDs, we return the full channel details
  channels: AgentChannelData[];
}

// Explicit type for data to be inserted into ai_agents table
interface AgentForCreate {
  name: string;
  prompt: string; // Will be empty for CustomAgent
  is_enabled: boolean;
  agent_type: string; // Match DB type, will be 'chattalyst' or 'CustomAgent'
  custom_agent_config: { webhook_url?: string; [key: string]: unknown; } | null;
  user_id: string;
}
// Explicit type for data to be used in updating ai_agents table
interface AgentForUpdate {
  name?: string;
  prompt?: string;
  is_enabled?: boolean;
  agent_type?: string; // Match DB type
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
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

  // Get channel IDs that are enabled
  const enabledChannelIds = channelsToCheck
    .filter(channel => channel.is_enabled_on_channel !== false)
    .map(channel => channel.integrations_config_id);

  if (enabledChannelIds.length === 0) {
    return { hasConflicts: false, conflicts: [] };
  }

  // Query for existing enabled channels linked to other ENABLED agents
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

  // Exclude current agent if updating
  if (excludeAgentId) {
    query = query.neq('agent_id', excludeAgentId);
  }

  const { data: existingChannels, error } = await query;

  if (error) {
    console.error('Error checking channel conflicts:', error);
    throw new Error('Failed to validate channel conflicts');
  }

  const conflicts = (existingChannels || []).map((channel: { integrations_config_id: string; agent_id: string; ai_agents: { name: string; is_enabled: boolean } }) => ({
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
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable not set.");
    const openai = new OpenAI({ apiKey });
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.replaceAll("\n", " "),
    });
    if (embeddingResponse.data.length === 0 || !embeddingResponse.data[0].embedding) {
        throw new Error("OpenAI embedding response did not contain embedding data.");
    }
    return embeddingResponse.data[0].embedding;
  } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
  }
}

serve(async (req: Request) => {
  const initialRequestTime = Date.now();
  console.log(`[${initialRequestTime}] RAW REQUEST RECEIVED: ${req.method} ${req.url}, User-Agent: ${req.headers.get('User-Agent')}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${initialRequestTime}] Responding to OPTIONS request for ${req.url}`);
    return new Response('ok', { headers: corsHeaders });
  }

  // This log will be slightly later than the RAW REQUEST log
  const requestStartTime = Date.now();
  console.log(`[${requestStartTime}] Handling ${req.method} request for ${req.url}`);

  try {
    const isInternalCall = req.headers.get('X-Internal-Call') === 'true';
    // Use service role client for internal calls, otherwise standard client
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

    // --- Internal Agent Query Handling (from whatsapp-webhook) ---
    if (req.method === 'POST' && isInternalCall && !agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Internal Agent Query`);
      try {
        const body = await req.json();
        const { agentId, query, sessionId, contactIdentifier } = body;

        if (!agentId || !query || !sessionId || !contactIdentifier) {
          return createJsonResponse({ error: 'Missing required fields for internal agent query (agentId, query, sessionId, contactIdentifier)' }, 400);
        }

        // Fetch agent details using the service role client
        const { data: agentData, error: agentFetchError } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('id', agentId)
          .single<AIAgentDbRow>();

        if (agentFetchError || !agentData) {
          console.error(`[${requestStartTime}] Internal Query: Agent ${agentId} not found. Error:`, agentFetchError?.message);
          return createJsonResponse({ error: `Agent not found: ${agentId}`, details: agentFetchError?.message }, 404);
        }
        
        console.log(`[${requestStartTime}] Internal Query: Processing for agent ${agentData.name} (ID: ${agentId}), Type: ${agentData.agent_type}`);

        let responseText: string | null = null;
        let imageUrl: string | null = null;
        let knowledgeUsed: unknown = null;

        if (agentData.agent_type === 'chattalyst') {
          try {
            console.log(`[${requestStartTime}] Internal Query: Processing Chattalyst agent.`);
            const apiKey = Deno.env.get("OPENAI_API_KEY");
            if (!apiKey) {
              console.error(`[${requestStartTime}] Internal Query: OPENAI_API_KEY not set.`);
              throw new Error("OPENAI_API_KEY environment variable not set for internal query.");
            }
            const openai = new OpenAI({ apiKey });

          // Fetch knowledge documents if any
          const { data: knowledgeLinks } = await supabase
            .from('ai_agent_knowledge_documents')
            .select('document_id')
            .eq('agent_id', agentId);

          let contextText = "";
          if (knowledgeLinks && knowledgeLinks.length > 0) {
            const documentIds = knowledgeLinks.map((link: { document_id: string }) => link.document_id);
            const queryEmbedding = await generateEmbedding(query);

            const { data: matchedChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: 0.75, // Example threshold
              match_count: 5,       // Example count
              document_ids_filter: documentIds
            });

            if (matchError) {
              console.error(`[${requestStartTime}] Internal Query: Error matching document chunks for agent ${agentId}:`, matchError.message);
            } else if (matchedChunks && matchedChunks.length > 0) {
              console.log(`[${requestStartTime}] Internal Query: Found ${matchedChunks.length} matching chunks in knowledge base.`);
              contextText = matchedChunks.map((chunk: { content: string }) => chunk.content).join("\n\n");
              knowledgeUsed = matchedChunks.map((chunk: { id: string; document_title: string; similarity: number }) => ({ id: chunk.id, title: chunk.document_title, similarity: chunk.similarity }));
            } else {
              console.log(`[${requestStartTime}] Internal Query: No matching chunks found in knowledge base.`);
            }
          }

          const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: agentData.prompt || "You are a helpful assistant." },
          ];
          if (contextText) {
            messages.push({ role: "system", content: `Use the following context to answer the user's query:\n${contextText}` });
          }
          messages.push({ role: "user", content: query });
          
          console.log(`[${requestStartTime}] Internal Query: Calling OpenAI API.`);
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
          });
          responseText = completion.choices[0]?.message?.content?.trim() || null;
          console.log(`[${requestStartTime}] Internal Query: OpenAI API call successful. Response:`, responseText);
        } catch (e) {
            const error = e as Error;
            console.error(`[${requestStartTime}] Internal Query: Error processing Chatalyst agent. Error: ${error.message}`);
            return createJsonResponse({ error: `Failed to process Chatalyst agent: ${error.message}` }, 500);
        }
      } else if (agentData.agent_type === 'CustomAgent' && agentData.custom_agent_config?.webhook_url) {
          const webhookUrl = agentData.custom_agent_config.webhook_url;
          console.log(`[${requestStartTime}] Internal Query: Forwarding to Custom Agent webhook: ${webhookUrl} for agent ${agentId}`);
          
          // Construct payload for custom agent. Ensure it matches what the custom agent expects.
          // This might need adjustment based on the custom agent's API.
          let processedContactIdentifier = contactIdentifier;
          if (contactIdentifier && contactIdentifier.endsWith('@s.whatsapp.net')) {
            processedContactIdentifier = contactIdentifier.substring(0, contactIdentifier.lastIndexOf('@s.whatsapp.net'));
            console.log(`[${requestStartTime}] Internal Query: Modified contactIdentifier from ${contactIdentifier} to ${processedContactIdentifier} for CustomAgent webhook.`);
          }

          const customAgentPayload = {
            message: query, 
            sessionId: sessionId,
            phone_number: processedContactIdentifier, 
            // Potentially add other relevant info from agentData.custom_agent_config
            ...(agentData.custom_agent_config.payload_template || {}) 
          };

          const customAgentResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customAgentPayload),
          });

          if (!customAgentResponse.ok) {
            const errorText = await customAgentResponse.text();
            console.error(`[${requestStartTime}] Internal Query: Custom Agent webhook for agent ${agentId} returned error ${customAgentResponse.status}: ${errorText}`);
            // Fallback to a generic error or agent's configured error message if available
            responseText = agentData.error_message || "Sorry, I encountered an issue with the custom service.";
          } else {
            const responseBodyText = await customAgentResponse.text();
            console.log(`[${requestStartTime}] Internal Query: Custom Agent webhook for agent ${agentId} returned status ${customAgentResponse.status}. Raw response body: "${responseBodyText}"`);
            if (responseBodyText && responseBodyText.trim() !== "") {
              try {
                console.log(`[${requestStartTime}] Internal Query: Attempting to parse response body for agent ${agentId}.`);
                let parsedData = JSON.parse(responseBodyText);

                // Handle double-stringified JSON
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
              responseText = agentData.error_message || "Sorry, the custom service returned an empty response.";
            }
          }
        } else {
          console.warn(`[${requestStartTime}] Internal Query: Agent ${agentId} type ${agentData.agent_type} not supported or webhook_url missing.`);
          responseText = agentData.error_message || "Sorry, this agent is not configured correctly.";
        }

        return createJsonResponse({ response: responseText, image: imageUrl, knowledge_used: knowledgeUsed }, 200);

      } catch (e) {
        console.error(`[${requestStartTime}] Internal Query: Error processing internal agent query. Error: ${(e as Error).message}`);
        return createJsonResponse({ error: 'Failed to process internal agent query', details: (e as Error).message }, 500);
      }
    }
    // --- END Internal Agent Query Handling ---

    // --- REST API Calls ---
    
    // --- CREATE AGENT (POST /) ---
    // Ensure this condition does not overlap with the internal call check
    if (req.method === 'POST' && !agentIdFromPath && !isInternalCall) {
      if (!userId) return createJsonResponse({ error: 'User authentication required for creating an agent' }, 401);
      console.log(`[${requestStartTime}] Routing to: Create Agent (REST)`);
      
      let payload: NewAgentPayload;
      try {
        payload = await req.json();
        if (!payload.name ||
            (payload.agent_type === 'chattalyst' && (payload.prompt === undefined || payload.prompt.trim() === '')) ||
            (payload.agent_type === 'CustomAgent' && (!payload.custom_agent_config || !payload.custom_agent_config.webhook_url))
           ) {
          throw new Error("Missing required fields: name, and prompt (for chattalyst) or custom_agent_config.webhook_url (for CustomAgent)");
        }
      } catch (jsonError) {
        return createJsonResponse({ error: 'Invalid payload for agent creation', details: (jsonError as Error).message }, 400);
      }

      const { knowledge_document_ids: knowledgeIdsToLink, channels: channelsToCreate, ...agentCorePayload } = payload;
      
      // Validate channel conflicts before creating the agent
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
            }, 409); // 409 Conflict status code
          }
        } catch (validationError) {
          console.error('Channel validation error:', validationError);
          return createJsonResponse({ error: 'Failed to validate channel conflicts', details: (validationError as Error).message }, 500);
        }
      }
      
      const agentToCreateData: AgentForCreate = {
        name: agentCorePayload.name,
        prompt: (agentCorePayload.agent_type === 'chattalyst' && agentCorePayload.prompt) ? agentCorePayload.prompt : '',
        is_enabled: agentCorePayload.is_enabled ?? true,
        agent_type: agentCorePayload.agent_type || 'chattalyst',
        custom_agent_config: (agentCorePayload.agent_type === 'CustomAgent' && agentCorePayload.custom_agent_config) ? agentCorePayload.custom_agent_config : null,
        user_id: userId!,
      };

      const { data: newAgent, error: agentInsertError } = await supabase
        .from('ai_agents').insert(agentToCreateData).select().single<AIAgentDbRow>();
      if (agentInsertError) {
        console.error("DB Insert Error:", agentInsertError); 
        return createJsonResponse({ error: 'Failed to create agent in database', details: agentInsertError.message }, 500);
      }
      if (!newAgent) return createJsonResponse({ error: 'Failed to create agent, no data returned after insert' }, 500);

      // Link knowledge documents
      if (knowledgeIdsToLink && knowledgeIdsToLink.length > 0) {
        const links = knowledgeIdsToLink.map((docId: string) => ({ agent_id: newAgent.id, document_id: docId }));
        await supabase.from('ai_agent_knowledge_documents').insert(links);
      }

      // Create channel configurations
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
          // If channel creation fails, we should ideally roll back the agent creation.
          // For now, log the error and return failure.
          console.error("Error creating agent channels:", error);
          await supabase.from('ai_agents').delete().eq('id', newAgent.id); // Attempt cleanup
          return createJsonResponse({ error: 'Failed to create agent channels', details: error.message }, 500);
        }
        createdChannels = data || [];
      }
      
      const responseAgent: AgentWithDetails = {
        ...newAgent,
        knowledge_document_ids: knowledgeIdsToLink || [],
        channels: createdChannels,
      };
      return createJsonResponse({ agent: responseAgent }, 201);
    }
    // --- LIST AGENTS (GET /) ---
    else if (req.method === 'GET' && !agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      // Ensure the user has a profile before allowing them to list all agents
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

      const agentIds = agentsData.map(a => a.id);
      // Fetch channels and knowledge links for all agents
      const { data: channelsData } = await supabase.from('ai_agent_channels').select('*').in('agent_id', agentIds);
      const { data: knowledgeLinksData } = await supabase.from('ai_agent_knowledge_documents').select('agent_id, document_id').in('agent_id', agentIds);
      
      const channelsMap = new Map<string, AgentChannelData[]>();
      if (channelsData) {
        channelsData.forEach((channel: AgentChannelData) => {
          const existing = channelsMap.get(channel.agent_id) || [];
          channelsMap.set(channel.agent_id, [...existing, channel]);
        });
      }

      const knowledgeLinksMap = new Map<string, string[]>();
      if (knowledgeLinksData) {
        knowledgeLinksData.forEach((link: { agent_id: string; document_id: string }) => {
          const existing = knowledgeLinksMap.get(link.agent_id) || [];
          knowledgeLinksMap.set(link.agent_id, [...existing, link.document_id]);
        });
      }

      const agentsWithDetails: AgentWithDetails[] = agentsData.map((agent: AIAgentDbRow) => {
        const agentChannels = channelsMap.get(agent.id) || [];
        // console.log(`Agent ${agent.id} has channels:`, agentChannels); // Debug log
        return {
          ...agent,
          channels: agentChannels,
          knowledge_document_ids: knowledgeLinksMap.get(agent.id) || [],
        };
      });
      return createJsonResponse({ agents: agentsWithDetails }, 200);
    }
    // --- GET AGENT (GET /:id) ---
    else if (req.method === 'GET' && agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      
      // Ensure the user has a profile before allowing them to get any agent
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

      // Fetch associated channels and knowledge links
      const { data: channelsData } = await supabase.from('ai_agent_channels').select('*').eq('agent_id', agentIdFromPath);
      const { data: knowledgeLinksData } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);
      
      const agentWithDetails: AgentWithDetails = {
        ...agentData,
        channels: channelsData || [],
        knowledge_document_ids: knowledgeLinksData?.map((link: { document_id: string }) => link.document_id) || [],
      };
      return createJsonResponse({ agent: agentWithDetails }, 200);
    }
    // --- UPDATE AGENT (PUT /:id or PATCH /:id) ---
    else if ((req.method === 'PUT' || req.method === 'PATCH') && agentIdFromPath) {
      if (!userId) {
        console.error(`[${requestStartTime}] Update Agent: User authentication required for ID: ${agentIdFromPath}`);
        return createJsonResponse({ error: 'User authentication required' }, 401);
      }
      
      console.log(`[${requestStartTime}] Routing to: Update Agent (REST - ID: ${agentIdFromPath})`);
      console.log(`[${requestStartTime}] Update Agent: Attempting to parse JSON for ID: ${agentIdFromPath}. Content-Type: ${req.headers.get('Content-Type')}`);

      let payload: UpdateAgentPayload;
      try {
        const rawBody = await req.text(); // Try reading as text first for debugging
        console.log(`[${requestStartTime}] Update Agent: Raw request body for ID ${agentIdFromPath}: ${rawBody.substring(0, 500)}`); // Log first 500 chars
        payload = JSON.parse(rawBody); // Then parse
      } catch (e) {
        console.error(`[${requestStartTime}] Update Agent: Invalid JSON for update for ID ${agentIdFromPath}. Error: ${(e as Error).message}. Raw body snippet: ${(await req.text()).substring(0,200)}`);
        return createJsonResponse({ error: 'Invalid JSON for update', details: (e as Error).message }, 400);
      }
      console.log(`[${requestStartTime}] Update Agent: Successfully parsed JSON payload for ID ${agentIdFromPath}`);

      const { knowledge_document_ids: knowledgeIdsToUpdate, channels: channelsToUpdate, ...agentCorePayload } = payload;
      
      const agentToUpdateData: AgentForUpdate = {};

      if (agentCorePayload.name !== undefined) agentToUpdateData.name = agentCorePayload.name;
      if (agentCorePayload.is_enabled !== undefined) agentToUpdateData.is_enabled = agentCorePayload.is_enabled;
      
      const agentTypeFromPayload = agentCorePayload.agent_type;

      if (agentTypeFromPayload) {
        agentToUpdateData.agent_type = agentTypeFromPayload;
        if (agentTypeFromPayload === 'chattalyst') {
          agentToUpdateData.custom_agent_config = null;
          if (agentCorePayload.prompt !== undefined) {
            agentToUpdateData.prompt = agentCorePayload.prompt;
          }
        } else if (agentTypeFromPayload === 'CustomAgent') {
          agentToUpdateData.prompt = '';
          if (agentCorePayload.custom_agent_config !== undefined) { 
            agentToUpdateData.custom_agent_config = agentCorePayload.custom_agent_config;
          } else {
            agentToUpdateData.custom_agent_config = null; 
          }
        }
      } else {
        if (agentCorePayload.prompt !== undefined) {
          agentToUpdateData.prompt = agentCorePayload.prompt;
          if (agentCorePayload.custom_agent_config === undefined) {
             agentToUpdateData.custom_agent_config = null;
          }
        }
        if (agentCorePayload.custom_agent_config !== undefined) {
          agentToUpdateData.custom_agent_config = agentCorePayload.custom_agent_config;
          if (agentCorePayload.prompt === undefined || agentCorePayload.prompt === '') {
            agentToUpdateData.prompt = '';
          }
        }
      }

      console.log(`[${requestStartTime}] Update Agent: User ID for update: ${userId}`);
      console.log(`[${requestStartTime}] Update Agent: Data to be updated for agent ${agentIdFromPath}:`, JSON.stringify(agentToUpdateData, null, 2));

      let updatedAgent: AIAgentDbRow | null = null;
      if (Object.keys(agentToUpdateData).length > 0) { // Check if there's anything to update
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

      if (knowledgeIdsToUpdate !== undefined) {
        await supabase.from('ai_agent_knowledge_documents').delete().eq('agent_id', agentIdFromPath);
        if (knowledgeIdsToUpdate && knowledgeIdsToUpdate.length > 0) {
          const links = knowledgeIdsToUpdate.map((id: string) => ({ agent_id: agentIdFromPath, document_id: id }));
          await supabase.from('ai_agent_knowledge_documents').insert(links);
        }
      }

      if (channelsToUpdate !== undefined) {
        console.log(`[${requestStartTime}] Updating channels for agent ${agentIdFromPath}:`, JSON.stringify(channelsToUpdate, null, 2));
        
        // Validate channel conflicts before updating
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
              }, 409); // 409 Conflict status code
            }
          } catch (validationError) {
            console.error('Channel validation error:', validationError);
            return createJsonResponse({ error: 'Failed to validate channel conflicts', details: (validationError as Error).message }, 500);
          }
        }
        
        // Simple strategy: delete all existing channels and re-create them from the payload.
        const { error: deleteError } = await supabase.from('ai_agent_channels').delete().eq('agent_id', agentIdFromPath);
        if (deleteError) {
            console.error(`[${requestStartTime}] Error deleting old channels for agent ${agentIdFromPath}:`, deleteError.message);
            // Decide if you should stop or continue. For now, we'll log and continue.
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
              // If insert fails, the agent is left in an inconsistent state (no channels).
              // Depending on requirements, you might want to return an error here.
          }
        }
      }
      
      const { data: finalChannels } = await supabase.from('ai_agent_channels').select('*').eq('agent_id', agentIdFromPath);
      const { data: finalKnowledge } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);

      const responseAgent: AgentWithDetails = {
        ...updatedAgent, 
        channels: finalChannels || [],
        knowledge_document_ids: finalKnowledge?.map((l: { document_id: string }) => l.document_id) || []
      };
      return createJsonResponse({ agent: responseAgent }, 200);
    }
    // --- DELETE AGENT (DELETE /:id) ---
    else if (req.method === 'DELETE' && agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      
      console.log(`[${requestStartTime}] Routing to: Delete Agent (REST - ID: ${agentIdFromPath})`);

      // First, verify the agent exists and belongs to the user
      const { data: agent, error: fetchError } = await supabase
        .from('ai_agents')
        .select('id')
        .eq('id', agentIdFromPath)
        .eq('user_id', userId)
        .single();

      if (fetchError || !agent) {
        // If the agent doesn't exist or doesn't belong to the user, return 404
        // This also handles cases where it's already deleted.
        return createJsonResponse({ error: 'Agent not found or access denied.' }, 404);
      }

      // The ON DELETE CASCADE on the tables should handle this automatically,
      // but explicit deletion is safer if the constraints change.
      await supabase.from('ai_agent_knowledge_documents').delete().eq('agent_id', agentIdFromPath);
      await supabase.from('ai_agent_channels').delete().eq('agent_id', agentIdFromPath);

      // Finally, delete the agent itself
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
