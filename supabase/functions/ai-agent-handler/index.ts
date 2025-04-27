import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';
import OpenAI from "openai"; // Use mapped import from import_map.json

// Define types based on database schema and expected payloads
type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

interface NewAgentPayload {
  name: string;
  prompt: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integration_ids?: string[]; // Added
  is_enabled?: boolean; // Added for create
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integration_ids?: string[];
  is_enabled?: boolean; // Added for update
}

// Combined type for responses including integrations
interface AgentWithIntegrations extends AIAgent {
  integration_ids: string[];
}


// Payload for direct invocation
interface AgentQueryPayload {
  agentId: string;
  query: string;
  sessionId: string;
  contactIdentifier: string;
  // conversationHistory?: any; // Optional history
}

// Response type for direct invocation
interface AgentQueryResponse {
  response?: string;
  knowledge_used?: string[] | null; // IDs of chunks used
  error?: string;
}


// Helper function to create consistent JSON responses with CORS headers
function createJsonResponse(body: unknown, status: number = 200): Response {
  // For 204 No Content, body should be null
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = { ...corsHeaders };
  if (status !== 204) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(responseBody, { status, headers });
}

// Implementation for generateEmbedding using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Supabase Edge Functions provide env vars via Deno.env
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable not set.");
    const openai = new OpenAI({ apiKey });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.replaceAll("\n", " "), // API recommends replacing newlines
    });

    if (embeddingResponse.data.length === 0 || !embeddingResponse.data[0].embedding) {
        throw new Error("OpenAI embedding response did not contain embedding data.");
    }

    return embeddingResponse.data[0].embedding;
  } catch (error) {
      console.error("Error generating embedding:", error);
      // Decide how to handle: re-throw, return null, or return dummy vector?
      // Re-throwing for now to make the failure explicit upstream.
      throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}


serve(async (req: Request) => {
  // Immediately handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  console.log(`[${requestStartTime}] Handling ${req.method} request for ${req.url}`);

  try {
    // --- Authentication & Client Initialization ---
    // Always initialize client with request context for user auth
    const supabase = createSupabaseClient(req);
    // Attempt to get user for REST API calls
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const userId = user?.id; // Store userId if available

    // --- Routing Logic ---
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const functionNameIndex = pathSegments.indexOf('ai-agent-handler');
    const relevantPathSegments = functionNameIndex !== -1 ? pathSegments.slice(functionNameIndex + 1) : [];
    const agentIdFromPath = relevantPathSegments.length === 1 ? relevantPathSegments[0] : null;

    console.log(`[${requestStartTime}] Parsed agentId from path: ${agentIdFromPath}`);

    // --- DIRECT INVOCATION (POST / without agentId in path) ---
    if (req.method === 'POST' && !agentIdFromPath) {
        console.log(`[${requestStartTime}] Routing to: Direct Agent Invocation`);
        // No user auth check here, assuming invocation comes from trusted source (service role)

        let payload: AgentQueryPayload;
        try {
            payload = await req.json();
            if (!payload.agentId || !payload.query || !payload.sessionId || !payload.contactIdentifier) {
                throw new Error("Missing required fields in invocation payload: agentId, query, sessionId, contactIdentifier");
            }
        } catch (jsonError) {
            console.error(`[${requestStartTime}] Agent Invocation JSON Parse/Validation Error:`, jsonError.message);
            return createJsonResponse({ error: 'Invalid or incomplete JSON payload for invocation', details: jsonError.message }, 400);
        }

        console.log(`[${requestStartTime}] Processing query for Agent ID: ${payload.agentId}, Session ID: ${payload.sessionId}`);

        try {
            // 1. Fetch Agent Details (Prompt, linked knowledge)
            // Use a service role client ONLY if necessary to bypass RLS for internal calls.
            // For now, assume the invoking function's service role allows reading ai_agents.
            const { data: agentData, error: agentFetchError } = await supabase
                .from('ai_agents')
                .select('id, name, prompt, knowledge_document_ids')
                .eq('id', payload.agentId)
                .single();

            if (agentFetchError || !agentData) {
                console.error(`[${requestStartTime}] Agent Invocation Error: Failed to fetch agent ${payload.agentId}`, agentFetchError?.message);
                return createJsonResponse({ error: `Agent not found or fetch failed: ${payload.agentId}` }, 404);
            }
            console.log(`[${requestStartTime}] Fetched agent: ${agentData.name}`);

            // 2. Fetch Relevant Knowledge
            let knowledgeContext = "";
            let knowledgeUsedIds: string[] | null = null;
            if (agentData.knowledge_document_ids && agentData.knowledge_document_ids.length > 0) {
                console.log(`[${requestStartTime}] Agent ${payload.agentId} has linked knowledge. Querying knowledge base...`);
                try {
                    const embedding = await generateEmbedding(payload.query);
                    const { data: chunks, error: chunkError } = await supabase.rpc('match_chunks', {
                        query_embedding: embedding,
                        match_threshold: 0.75,
                        match_count: 5,
                        document_ids: agentData.knowledge_document_ids,
                        filter_enabled: true
                    });

                    if (chunkError) {
                        console.error(`[${requestStartTime}] Knowledge query error for agent ${payload.agentId}:`, chunkError.message);
                    } else if (chunks && chunks.length > 0) {
                        knowledgeContext = chunks.map((c: { content: string }) => c.content).join("\n\n");
                        knowledgeUsedIds = chunks.map((c: { id: string }) => c.id);
                        console.log(`[${requestStartTime}] Found ${chunks.length} relevant knowledge chunks.`);
                    } else {
                         console.log(`[${requestStartTime}] No relevant knowledge chunks found.`);
                    }
                } catch (knowledgeError) {
                     console.error(`[${requestStartTime}] Error during knowledge retrieval for agent ${payload.agentId}:`, knowledgeError.message);
                }
            } else {
                 console.log(`[${requestStartTime}] Agent ${payload.agentId} has no linked knowledge documents.`);
            }

            // 3. Construct Prompt for LLM
            const finalPrompt = `
${agentData.prompt}

Context from Knowledge Base:
---
${knowledgeContext || "No relevant context found."}
---

User Query: ${payload.query}

Response:`;

            // 4. Call LLM
            console.log(`[${requestStartTime}] Calling LLM for agent ${payload.agentId}...`);
            let llmResponseText: string;
            try {
                const apiKey = Deno.env.get("OPENAI_API_KEY");
                if (!apiKey) throw new Error("OPENAI_API_KEY environment variable not set.");
                const openai = new OpenAI({ apiKey });

                console.log(`[${requestStartTime}] Sending prompt to OpenAI...`);

                const chatCompletion = await openai.chat.completions.create({
                    messages: [{ role: "user", content: finalPrompt }],
                    model: "gpt-3.5-turbo",
                    temperature: 0.7,
                });

                llmResponseText = chatCompletion.choices[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response.";
                console.log(`[${requestStartTime}] LLM response received.`);

            } catch (llmError) {
                console.error(`[${requestStartTime}] LLM call failed for agent ${payload.agentId}:`, llmError);
                 return createJsonResponse({ error: 'LLM processing failed', details: llmError.message }, 500);
            }

            // 5. Return Success Response
            const successResponse: AgentQueryResponse = {
                response: llmResponseText,
                knowledge_used: knowledgeUsedIds
            };
            console.log(`[${requestStartTime}] Agent ${payload.agentId} processed query successfully. Knowledge Used: ${knowledgeUsedIds?.length || 0}`);
            return createJsonResponse(successResponse, 200);

        } catch (processingError) {
            console.error(`[${requestStartTime}] Error during agent query processing for agent ${payload.agentId}:`, processingError.message);
            return createJsonResponse({ error: 'Failed to process agent query', details: processingError.message }, 500);
        }
    }

    // --- REST API Calls (Require User Authentication) ---
    // Check for user authentication for all subsequent routes
    if (!userId) {
      console.error(`[${requestStartTime}] Auth Error: User authentication required for REST API call.`);
      return createJsonResponse({ error: 'User authentication required' }, 401);
    }
    console.log(`[${requestStartTime}] Authenticated user for REST API: ${userId}`);


    // --- LIST AGENTS (GET /) ---
    if (req.method === 'GET' && !agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: List Agents (REST)`);
      // 1. Fetch base agent data
      const { data: agentsData, error: fetchAgentsError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', userId) // Use authenticated userId
        .order('created_at', { ascending: false });

      if (fetchAgentsError) {
        console.error(`[${requestStartTime}] List Agents Error (Agents):`, fetchAgentsError.message);
        return createJsonResponse({ error: 'Failed to fetch AI agents', details: fetchAgentsError.message }, 500);
      }

      if (!agentsData || agentsData.length === 0) {
        console.log(`[${requestStartTime}] No agents found for user ${userId}`);
        return createJsonResponse({ agents: [] }, 200);
      }

      // 2. Fetch integrations for all fetched agents
      const agentIds = agentsData.map(a => a.id);
      const { data: integrationsData, error: fetchIntegrationsError } = await supabase
        .from('ai_agent_integrations')
        .select('agent_id, integration_id')
        .in('agent_id', agentIds);

      if (fetchIntegrationsError) {
         console.error(`[${requestStartTime}] List Agents Warning (Integrations):`, fetchIntegrationsError.message);
         const agentsWithoutIntegrations = agentsData.map(agent => ({
            ...agent,
            integration_ids: [],
         }));
         return createJsonResponse({ agents: agentsWithoutIntegrations as AgentWithIntegrations[] }, 200);
      }

      // 3. Map integrations to agents
      const integrationsMap = new Map<string, string[]>();
      if (integrationsData) {
        for (const link of integrationsData) {
          const currentIds = integrationsMap.get(link.agent_id) || [];
          currentIds.push(link.integration_id);
          integrationsMap.set(link.agent_id, currentIds);
        }
      }

      // 4. Combine data
      const agentsWithIntegrations = agentsData.map(agent => ({
        ...agent,
        integration_ids: integrationsMap.get(agent.id) || [],
      }));

      console.log(`[${requestStartTime}] Found ${agentsWithIntegrations.length} agents with integrations for user ${userId}`);
      return createJsonResponse({ agents: agentsWithIntegrations as AgentWithIntegrations[] }, 200);
    }

    // --- GET AGENT (GET /:id) ---
    else if (req.method === 'GET' && agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Get Agent (REST - ID: ${agentIdFromPath})`);
      // 1. Fetch agent data
      const { data: agentData, error: agentFetchError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentIdFromPath)
        .eq('user_id', userId) // Use authenticated userId
        .single();

      if (agentFetchError) {
        console.error(`[${requestStartTime}] Get Agent Error (Agent Fetch - ID: ${agentIdFromPath}):`, agentFetchError.message);
        const status = agentFetchError.code === 'PGRST116' ? 404 : 500;
        const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to fetch AI agent';
        return createJsonResponse({ error: message, details: agentFetchError.message }, status);
      }
      if (!agentData) {
         console.warn(`[${requestStartTime}] Get Agent (ID: ${agentIdFromPath}): Agent not found after successful query (unexpected).`);
         return createJsonResponse({ error: 'AI Agent not found' }, 404);
      }

      // 2. Fetch integrations
      let integrationIds: string[] = [];
      const { data: integrationsData, error: integrationsFetchError } = await supabase
        .from('ai_agent_integrations')
        .select('integration_id')
        .eq('agent_id', agentIdFromPath);

      if (integrationsFetchError) {
         console.error(`[${requestStartTime}] Get Agent Warning (Integrations Fetch - ID: ${agentIdFromPath}):`, integrationsFetchError.message);
      } else if (integrationsData) {
         integrationIds = integrationsData.map(link => link.integration_id);
      }

      // 3. Combine data
      const agentWithIntegrations = { ...agentData, integration_ids: integrationIds };

      console.log(`[${requestStartTime}] Found agent: ${agentWithIntegrations.name} (ID: ${agentIdFromPath}) with ${agentWithIntegrations.integration_ids.length} integrations for user ${userId}`);
      return createJsonResponse({ agent: agentWithIntegrations as AgentWithIntegrations }, 200);
    }

    // --- UPDATE AGENT (PUT /:id or PATCH /:id) ---
    else if ((req.method === 'PUT' || req.method === 'PATCH') && agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Update Agent (REST - ID: ${agentIdFromPath})`);
      let payload: UpdateAgentPayload;
       try {
        payload = await req.json();
      } catch (jsonError) {
        console.error(`[${requestStartTime}] Update Agent JSON Parse Error (ID: ${agentIdFromPath}):`, jsonError.message);
        return createJsonResponse({ error: 'Invalid JSON payload for agent update', details: jsonError.message }, 400);
      }

      if (Object.keys(payload).length === 0) {
         console.warn(`[${requestStartTime}] Update Agent Bad Request (ID: ${agentIdFromPath}): No update fields provided`);
         return createJsonResponse({ error: 'No update fields provided for agent update' }, 400);
      }

      const agentToUpdate: Partial<AIAgent & { is_enabled?: boolean }> = {};
      if (payload.name !== undefined) agentToUpdate.name = payload.name;
      if (payload.prompt !== undefined) agentToUpdate.prompt = payload.prompt;
      if (payload.knowledge_document_ids !== undefined) {
        agentToUpdate.knowledge_document_ids = payload.knowledge_document_ids;
      }
      if (payload.keyword_trigger !== undefined) {
        agentToUpdate.keyword_trigger = payload.keyword_trigger;
      }
      if (payload.is_enabled !== undefined) {
        agentToUpdate.is_enabled = payload.is_enabled;
      }

      // 1. Update the agent table
      const { data: updatedAgentData, error: agentUpdateError } = await supabase
        .from('ai_agents')
        .update(agentToUpdate)
        .eq('id', agentIdFromPath)
        .eq('user_id', userId) // Use authenticated userId
        .select()
        .single();

      if (agentUpdateError) {
        console.error(`[${requestStartTime}] Update Agent DB Error (Agent Update - ID: ${agentIdFromPath}):`, agentUpdateError.message);
        const status = agentUpdateError.code === 'PGRST116' ? 404 : 500;
        const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to update AI agent';
        return createJsonResponse({ error: message, details: agentUpdateError.message }, status);
      }
      if (!updatedAgentData) {
         console.warn(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Agent not found after successful update (unexpected).`);
         return createJsonResponse({ error: 'AI Agent not found after update attempt' }, 404);
      }

      // 2. Update integrations if provided
      let finalIntegrationIds: string[] = [];
      let integrationUpdateError: Error | null = null;

      if (payload.integration_ids !== undefined) {
         finalIntegrationIds = payload.integration_ids || [];

         // Delete existing integrations for this agent
         const { error: deleteIntegrationsError } = await supabase
           .from('ai_agent_integrations')
           .delete()
           .eq('agent_id', agentIdFromPath);

         if (deleteIntegrationsError) {
            console.error(`[${requestStartTime}] Update Agent Warning (Delete Integrations - ID: ${agentIdFromPath}):`, deleteIntegrationsError.message);
            integrationUpdateError = new Error('Failed to clear existing agent integrations');
         } else if (finalIntegrationIds.length > 0) {
            // Insert new integrations
            const newIntegrationLinks = finalIntegrationIds.map(intId => ({
              agent_id: agentIdFromPath,
              integration_id: intId,
               // TODO: Add activation_mode here if passed from frontend and save it
            }));
            const { error: insertIntegrationsError } = await supabase
              .from('ai_agent_integrations')
              .insert(newIntegrationLinks);

            if (insertIntegrationsError) {
              console.error(`[${requestStartTime}] Update Agent Warning (Insert Integrations - ID: ${agentIdFromPath}):`, insertIntegrationsError.message);
              integrationUpdateError = new Error('Failed to insert new agent integrations');
            } else {
               console.log(`[${requestStartTime}] Updated integrations for agent (ID: ${agentIdFromPath}) to: [${finalIntegrationIds.join(', ')}]`);
            }
         }
      } else {
         // If integration_ids was *not* in the payload, fetch existing ones
          const { data: currentIntegrations, error: fetchCurrentIntegrationsError } = await supabase
            .from('ai_agent_integrations')
            .select('integration_id')
            .eq('agent_id', agentIdFromPath);

          if (fetchCurrentIntegrationsError) {
             console.error(`[${requestStartTime}] Update Agent Warning (Fetch Current Integrations - ID: ${agentIdFromPath}):`, fetchCurrentIntegrationsError.message);
             integrationUpdateError = new Error('Failed to fetch current integrations after update');
          } else {
             finalIntegrationIds = currentIntegrations ? currentIntegrations.map(link => link.integration_id) : [];
          }
      }

      // 3. Return combined data
      const finalAgentResponse = { ...updatedAgentData, integration_ids: finalIntegrationIds };
      console.log(`[${requestStartTime}] Updated agent: ${finalAgentResponse.name} (ID: ${agentIdFromPath}) for user ${userId}`);
      if (integrationUpdateError) {
         console.warn(`[${requestStartTime}] Update Agent completed with integration errors for agent ID ${agentIdFromPath}: ${integrationUpdateError.message}`);
      }
      return createJsonResponse({ agent: finalAgentResponse as AgentWithIntegrations }, 200);
    }

    // --- DELETE AGENT (DELETE /:id) ---
    else if (req.method === 'DELETE' && agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Delete Agent (REST - ID: ${agentIdFromPath})`);
       // Ensure userId is available for REST API calls
       if (!userId) {
         console.error(`[${requestStartTime}] Auth Error: userId is null for DELETE call.`);
         return createJsonResponse({ error: 'User authentication required for this operation' }, 401);
       }
      const { error: deleteError } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentIdFromPath)
        .eq('user_id', userId);

      if (deleteError) {
        console.error(`[${requestStartTime}] Delete Agent DB Error (ID: ${agentIdFromPath}):`, deleteError.message);
        if (deleteError.code !== 'PGRST116') {
           return createJsonResponse({ error: 'Failed to delete AI agent', details: deleteError.message }, 500);
        }
         console.warn(`[${requestStartTime}] Delete Agent (ID: ${agentIdFromPath}): Agent not found (PGRST116), proceeding with 204.`);
      }

      console.log(`[${requestStartTime}] Deleted agent (ID: ${agentIdFromPath}) or agent did not exist for user ${userId}.`);
      return createJsonResponse(null, 204);
    }

    // --- METHOD/ROUTE NOT ALLOWED ---
    // This handles cases like POST /:id or other invalid combinations
    else {
      console.warn(`[${requestStartTime}] Method Not Allowed: ${req.method} for path with agentId=${agentIdFromPath}`);
      return createJsonResponse({ error: 'Method Not Allowed or Invalid Route' }, 405);
    }

  } catch (error) {
    // Catch unexpected errors
    console.error(`[${requestStartTime}] Unhandled Top-Level Error:`, error.message, error.stack);
    return createJsonResponse({ error: 'Internal server error', details: error.message }, 500);
  } finally {
      const requestEndTime = Date.now();
      console.log(`[${requestStartTime}] Request finished in ${requestEndTime - requestStartTime}ms`);
  }
});
