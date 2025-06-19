import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'; // Changed to direct URL import
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';
import OpenAI from "openai"; // Use mapped import from import_map.json

// Define types based on database schema and expected payloads
type AIAgentDbRow = Database['public']['Tables']['ai_agents']['Row'];

interface NewAgentPayload {
  name: string;
  prompt?: string; // Prompt is optional for CustomAgent
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integrations_config_ids?: string[]; // Changed from integration_ids
  is_enabled?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  agent_type?: 'chattalyst' | 'CustomAgent'; // Updated agent_type
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null; // New field, using unknown
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integrations_config_ids?: string[]; // Changed from integration_ids
  is_enabled?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  agent_type?: 'chattalyst' | 'CustomAgent'; // Updated agent_type
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null; // New field, using unknown
}

interface AgentWithDetails extends AIAgentDbRow { 
  integrations_config_ids: string[]; // Changed from integration_ids
  knowledge_document_ids: string[];
}

// Explicit type for data to be inserted into ai_agents table
interface AgentForCreate {
  name: string;
  prompt: string; // Will be empty for CustomAgent
  keyword_trigger: string | null;
  is_enabled: boolean;
  activation_mode: Database["public"]["Enums"]["agent_activation_mode"]; // Match DB type
  agent_type: string; // Match DB type, will be 'chattalyst' or 'CustomAgent'
  custom_agent_config: { webhook_url?: string; [key: string]: unknown; } | null;
  user_id: string;
}
// Explicit type for data to be used in updating ai_agents table
interface AgentForUpdate {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  is_enabled?: boolean;
  activation_mode?: Database["public"]["Enums"]["agent_activation_mode"]; // Match DB type
  agent_type?: string; // Match DB type
  custom_agent_config?: { webhook_url?: string; [key: string]: unknown; } | null;
}


function createJsonResponse(body: unknown, status: number = 200): Response {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = { ...corsHeaders };
  if (status !== 204) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(responseBody, { status, headers });
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
        let knowledgeUsed: unknown = null;

        if (agentData.agent_type === 'chattalyst') {
          // Simplified logic for Chattalyst agent - direct OpenAI call or knowledge base query
          // This part needs to be fleshed out based on how 'chattalyst' agents are supposed to work.
          // For now, let's assume a direct OpenAI call with the agent's prompt and user query.
          
          const apiKey = Deno.env.get("OPENAI_API_KEY");
          if (!apiKey) throw new Error("OPENAI_API_KEY environment variable not set for internal query.");
          const openai = new OpenAI({ apiKey });

          // Fetch knowledge documents if any
          const { data: knowledgeLinks } = await supabase
            .from('ai_agent_knowledge_documents')
            .select('document_id')
            .eq('agent_id', agentId);

          let contextText = "";
          if (knowledgeLinks && knowledgeLinks.length > 0) {
            const documentIds = knowledgeLinks.map(link => link.document_id);
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
              contextText = matchedChunks.map(chunk => chunk.content).join("\n\n");
              knowledgeUsed = matchedChunks.map(chunk => ({ id: chunk.id, title: chunk.document_title, similarity: chunk.similarity }));
            }
          }

          const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: agentData.prompt || "You are a helpful assistant." },
          ];
          if (contextText) {
            messages.push({ role: "system", content: `Use the following context to answer the user's query:\n${contextText}` });
          }
          messages.push({ role: "user", content: query });
          
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
          });
          responseText = completion.choices[0]?.message?.content?.trim() || null;

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
            message: query, // Changed key from query
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
                console.log(`[${requestStartTime}] Internal Query: Attempting to parse non-empty response body for agent ${agentId}.`);
                const responseJson = JSON.parse(responseBodyText);
                responseText = responseJson.output || responseJson.response || null; 
                knowledgeUsed = responseJson.knowledge_used || null;
                console.log(`[${requestStartTime}] Internal Query: Successfully parsed response for agent ${agentId}. Response text: ${responseText}`);
              } catch (parseError) {
                console.error(`[${requestStartTime}] Internal Query: Failed to parse JSON response from Custom Agent webhook for agent ${agentId}. Body: "${responseBodyText.substring(0, 500)}"... Error: ${(parseError as Error).message}`);
                responseText = agentData.error_message || "Sorry, the custom service returned an invalid JSON response.";
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

        return createJsonResponse({ response: responseText, knowledge_used: knowledgeUsed }, 200);

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

      const { knowledge_document_ids: knowledgeIdsToLink, integrations_config_ids: integrationsConfigIdsToLink, ...agentCorePayload } = payload; // Changed
      
      const agentToCreateData: AgentForCreate = {
        name: agentCorePayload.name,
        prompt: (agentCorePayload.agent_type === 'chattalyst' && agentCorePayload.prompt) ? agentCorePayload.prompt : '',
        keyword_trigger: agentCorePayload.keyword_trigger || null,
        is_enabled: agentCorePayload.is_enabled ?? true,
        activation_mode: agentCorePayload.activation_mode || 'keyword',
        agent_type: agentCorePayload.agent_type || 'chattalyst', // Will be 'chattalyst' or 'CustomAgent'
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

      if (knowledgeIdsToLink && knowledgeIdsToLink.length > 0) {
        const links = knowledgeIdsToLink.map(docId => ({ agent_id: newAgent.id, document_id: docId }));
        await supabase.from('ai_agent_knowledge_documents').insert(links);
      }
      if (integrationsConfigIdsToLink && integrationsConfigIdsToLink.length > 0) {
        const links = integrationsConfigIdsToLink.map(configId => ({ 
          agent_id: newAgent.id, 
          integrations_config_id: configId
        }));
        await supabase.from('ai_agent_integrations').insert(links);
      }
      
      const responseAgent: AgentWithDetails = {
        ...newAgent,
        integrations_config_ids: integrationsConfigIdsToLink || [],
        knowledge_document_ids: knowledgeIdsToLink || [],
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
        console.error(`[${requestStartTime}] Profile check failed for user ${userId}:`, profileError);
        return createJsonResponse({ error: 'User profile not found or access denied.' }, 403);
      }
      
      console.log(`[${requestStartTime}] Routing to: List Agents (REST) - User ${userId} has a profile.`);
      const { data: agentsData, error: fetchAgentsError } = await supabase
        .from('ai_agents').select('*').order('created_at', { ascending: false });
      if (fetchAgentsError) return createJsonResponse({ error: 'Failed to fetch agents', details: fetchAgentsError.message }, 500);
      if (!agentsData) return createJsonResponse({ agents: [] }, 200);

      const agentIds = agentsData.map(a => a.id);
      // Fetch using the new integrations_config_id
      const { data: integrationsData } = await supabase.from('ai_agent_integrations').select('agent_id, integrations_config_id').in('agent_id', agentIds);
      const { data: knowledgeLinksData } = await supabase.from('ai_agent_knowledge_documents').select('agent_id, document_id').in('agent_id', agentIds);
      
      const integrationsMap = new Map<string, string[]>();
      if (integrationsData) integrationsData.forEach(link => {
        if (link.integrations_config_id) { // Ensure it's not null
          integrationsMap.set(link.agent_id, [...(integrationsMap.get(link.agent_id) || []), link.integrations_config_id])
        }
      });
      const knowledgeLinksMap = new Map<string, string[]>();
      if (knowledgeLinksData) knowledgeLinksData.forEach(link => knowledgeLinksMap.set(link.agent_id, [...(knowledgeLinksMap.get(link.agent_id) || []), link.document_id]));

      const agentsWithDetails: AgentWithDetails[] = agentsData.map(agent => ({
        ...agent,
        integrations_config_ids: integrationsMap.get(agent.id) || [],
        knowledge_document_ids: knowledgeLinksMap.get(agent.id) || [],
      }));
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

      // Fetch using the new integrations_config_id
      const { data: integrationsData } = await supabase.from('ai_agent_integrations').select('integrations_config_id').eq('agent_id', agentIdFromPath);
      const { data: knowledgeLinksData } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);
      
      const agentWithDetails: AgentWithDetails = {
        ...agentData,
        integrations_config_ids: integrationsData?.map(link => link.integrations_config_id).filter(id => id !== null) as string[] || [],
        knowledge_document_ids: knowledgeLinksData?.map(link => link.document_id) || [],
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

      const { knowledge_document_ids: knowledgeIdsToUpdate, integrations_config_ids: integrationsConfigIdsToUpdate, ...agentCorePayload } = payload; // Changed
      
      const agentToUpdateData: AgentForUpdate = {}; // Using the explicitly defined interface

      if (agentCorePayload.name !== undefined) agentToUpdateData.name = agentCorePayload.name;
      if (agentCorePayload.keyword_trigger !== undefined) agentToUpdateData.keyword_trigger = agentCorePayload.keyword_trigger;
      if (agentCorePayload.is_enabled !== undefined) agentToUpdateData.is_enabled = agentCorePayload.is_enabled;
      if (agentCorePayload.activation_mode !== undefined) agentToUpdateData.activation_mode = agentCorePayload.activation_mode;
      
      const agentTypeFromPayload = agentCorePayload.agent_type; // This is 'chattalyst' | 'CustomAgent' | undefined

      if (agentTypeFromPayload) { // If agent_type is being explicitly set
        agentToUpdateData.agent_type = agentTypeFromPayload;
        if (agentTypeFromPayload === 'chattalyst') {
          agentToUpdateData.custom_agent_config = null;
          if (agentCorePayload.prompt !== undefined) {
            agentToUpdateData.prompt = agentCorePayload.prompt;
          }
        } else if (agentTypeFromPayload === 'CustomAgent') {
          agentToUpdateData.prompt = ''; // Custom agents don't use our prompt field
          if (agentCorePayload.custom_agent_config !== undefined) { 
            agentToUpdateData.custom_agent_config = agentCorePayload.custom_agent_config;
          } else {
            agentToUpdateData.custom_agent_config = null; 
          }
        }
      } else {
        // If agent_type is NOT in payload, update prompt and custom_agent_config only if they are explicitly provided
        if (agentCorePayload.prompt !== undefined) {
          agentToUpdateData.prompt = agentCorePayload.prompt;
          if (agentCorePayload.custom_agent_config === undefined) { // If prompt is set, and no custom_config, nullify custom_config
             agentToUpdateData.custom_agent_config = null;
          }
        }
        if (agentCorePayload.custom_agent_config !== undefined) {
          agentToUpdateData.custom_agent_config = agentCorePayload.custom_agent_config;
          if (agentCorePayload.prompt === undefined || agentCorePayload.prompt === '') { // If custom_config is set, and no prompt, empty prompt
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

      if (knowledgeIdsToUpdate !== undefined) { // This means the key was present in the payload
        await supabase.from('ai_agent_knowledge_documents').delete().eq('agent_id', agentIdFromPath);
        // Check if knowledgeIdsToUpdate is not null AND has items before trying to map/insert
        if (knowledgeIdsToUpdate && knowledgeIdsToUpdate.length > 0) {
          const links = knowledgeIdsToUpdate.map(id => ({ agent_id: agentIdFromPath, document_id: id }));
          await supabase.from('ai_agent_knowledge_documents').insert(links);
        }
      }
      if (integrationsConfigIdsToUpdate !== undefined) { // This means the key was present in the payload
        await supabase.from('ai_agent_integrations').delete().eq('agent_id', agentIdFromPath);
        if (integrationsConfigIdsToUpdate && integrationsConfigIdsToUpdate.length > 0) {
          const links = integrationsConfigIdsToUpdate.map(configId => ({ 
            agent_id: agentIdFromPath, 
            integrations_config_id: configId
          }));
          await supabase.from('ai_agent_integrations').insert(links);
        }
      }
      
      const { data: finalIntegrations } = await supabase.from('ai_agent_integrations').select('integrations_config_id').eq('agent_id', agentIdFromPath);
      const { data: finalKnowledge } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);

      const responseAgent: AgentWithDetails = {
        ...updatedAgent, 
        integrations_config_ids: finalIntegrations?.map(l => l.integrations_config_id).filter(id => id !== null) as string[] || [],
        knowledge_document_ids: finalKnowledge?.map(l => l.document_id) || []
      };
      return createJsonResponse({ agent: responseAgent }, 200);
    }
    // --- DELETE AGENT (DELETE /:id) ---
    else if (req.method === 'DELETE' && agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      const { error } = await supabase.from('ai_agents').delete().eq('id', agentIdFromPath).eq('user_id', userId);
      if (error && error.code !== 'PGRST116') return createJsonResponse({ error: 'Failed to delete agent', details: error.message }, 500);
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
