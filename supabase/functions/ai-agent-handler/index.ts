// Removed Deno types reference again
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';
import OpenAI from "openai"; // Use mapped import from import_map.json

// Define types based on database schema and expected payloads
type AIAgent = Database['public']['Tables']['ai_agents']['Row'];
// Remove the knowledge_document_ids column from the base type if it existed
type BaseAIAgent = Omit<AIAgent, 'knowledge_document_ids'>; // Adjust if the column name was different or didn't exist

interface NewAgentPayload {
  name: string;
  prompt: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[]; // IDs to link
  integration_ids?: string[];
  is_enabled?: boolean;
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[]; // IDs to link
  integration_ids?: string[];
  is_enabled?: boolean;
}

// Combined type for responses including integrations and knowledge docs
interface AgentWithDetails extends BaseAIAgent { // Use BaseAIAgent
  integration_ids: string[];
  knowledge_document_ids: string[];
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
            // 1. Fetch Agent Details (Prompt, linked knowledge using the join table)
            const { data: agentData, error: agentFetchError } = await supabase
                .from('ai_agents')
                .select(`
                  id,
                  name,
                  prompt,
                  ai_agent_knowledge_documents ( document_id )
                `)
                .eq('id', payload.agentId)
                .single();

            if (agentFetchError || !agentData) {
                console.error(`[${requestStartTime}] Agent Invocation Error: Failed to fetch agent ${payload.agentId}`, agentFetchError?.message);
                return createJsonResponse({ error: `Agent not found or fetch failed: ${payload.agentId}` }, 404);
            }
            console.log(`[${requestStartTime}] Fetched agent: ${agentData.name}`);

            // Extract document IDs from the join table result
            const knowledgeDocumentIds = agentData.ai_agent_knowledge_documents?.map((link: { document_id: string }) => link.document_id) || [];

            // 2. Fetch Relevant Knowledge
            let knowledgeContext = "";
            let knowledgeUsedIds: string[] | null = null;
            if (knowledgeDocumentIds.length > 0) {
                console.log(`[${requestStartTime}] Agent ${payload.agentId} has linked knowledge. Querying knowledge base...`);
                try {
                    const embedding = await generateEmbedding(payload.query);
                    // Use the fetched knowledgeDocumentIds for filtering
                    const { data: chunks, error: chunkError } = await supabase.rpc('match_chunks', {
                        query_embedding: embedding,
                        match_threshold: 0.75, // Consider making this configurable per agent?
                        match_count: 5,       // Consider making this configurable per agent?
                        filter_document_ids: knowledgeDocumentIds // Pass the correct IDs
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
      // 1. Fetch base agent data (excluding knowledge_document_ids if it was a direct column)
      const { data: agentsData, error: fetchAgentsError } = await supabase
        .from('ai_agents')
        .select('*') // Select all columns from ai_agents
        .eq('user_id', userId)
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

      // 3. Fetch knowledge document links for all fetched agents
      const { data: knowledgeLinksData, error: fetchKnowledgeLinksError } = await supabase
        .from('ai_agent_knowledge_documents')
        .select('agent_id, document_id')
        .in('agent_id', agentIds);

      // Handle potential errors fetching links (log warning, return empty arrays)
      if (fetchIntegrationsError) {
         console.error(`[${requestStartTime}] List Agents Warning (Integrations):`, fetchIntegrationsError.message);
      }
      if (fetchKnowledgeLinksError) {
         console.error(`[${requestStartTime}] List Agents Warning (Knowledge Links):`, fetchKnowledgeLinksError.message);
      }

      // 4. Map integrations and knowledge links to agents
      const integrationsMap = new Map<string, string[]>();
      if (integrationsData) {
        for (const link of integrationsData) {
          const currentIds = integrationsMap.get(link.agent_id) || [];
          currentIds.push(link.integration_id);
          integrationsMap.set(link.agent_id, currentIds);
        }
      }
      const knowledgeLinksMap = new Map<string, string[]>();
      if (knowledgeLinksData) {
        for (const link of knowledgeLinksData) {
          const currentIds = knowledgeLinksMap.get(link.agent_id) || [];
          currentIds.push(link.document_id);
          knowledgeLinksMap.set(link.agent_id, currentIds);
        }
      }

      // 5. Combine data
      const agentsWithDetails = agentsData.map(agent => {
        // Remove the old knowledge_document_ids column if it exists on the agent object
        const { knowledge_document_ids, ...baseAgent } = agent;
        return {
          ...baseAgent,
          integration_ids: integrationsMap.get(agent.id) || [],
          knowledge_document_ids: knowledgeLinksMap.get(agent.id) || [],
        };
      });

      console.log(`[${requestStartTime}] Found ${agentsWithDetails.length} agents with details for user ${userId}`);
      return createJsonResponse({ agents: agentsWithDetails as AgentWithDetails[] }, 200);
    }

    // --- GET AGENT (GET /:id) ---
    else if (req.method === 'GET' && agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Get Agent (REST - ID: ${agentIdFromPath})`);
      // 1. Fetch agent data (excluding knowledge_document_ids if it was a direct column)
      const { data: agentData, error: agentFetchError } = await supabase
        .from('ai_agents')
        .select('*') // Select all columns from ai_agents
        .eq('id', agentIdFromPath)
        .eq('user_id', userId)
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

      // 3. Fetch knowledge document links
      let knowledgeDocumentIds: string[] = [];
      const { data: knowledgeLinksData, error: knowledgeLinksFetchError } = await supabase
        .from('ai_agent_knowledge_documents')
        .select('document_id')
        .eq('agent_id', agentIdFromPath);

      if (knowledgeLinksFetchError) {
         console.error(`[${requestStartTime}] Get Agent Warning (Knowledge Links Fetch - ID: ${agentIdFromPath}):`, knowledgeLinksFetchError.message);
      } else if (knowledgeLinksData) {
         knowledgeDocumentIds = knowledgeLinksData.map(link => link.document_id);
      }

      // 4. Combine data
      // Remove the old knowledge_document_ids column if it exists on the agent object
      const { knowledge_document_ids, ...baseAgentData } = agentData;
      const agentWithDetails = {
        ...baseAgentData,
        integration_ids: integrationIds,
        knowledge_document_ids: knowledgeDocumentIds,
      };

      console.log(`[${requestStartTime}] Found agent: ${agentWithDetails.name} (ID: ${agentIdFromPath}) with ${agentWithDetails.integration_ids.length} integrations and ${agentWithDetails.knowledge_document_ids.length} knowledge docs for user ${userId}`);
      return createJsonResponse({ agent: agentWithDetails as AgentWithDetails }, 200);
    }

    // --- CREATE AGENT (POST /) ---
    else if (req.method === 'POST' && !agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Create Agent (REST)`);
      let payload: NewAgentPayload;
      try {
        payload = await req.json();
        if (!payload.name || !payload.prompt) {
          throw new Error("Missing required fields: name, prompt");
        }
      } catch (jsonError) {
        console.error(`[${requestStartTime}] Create Agent JSON Parse/Validation Error:`, jsonError.message);
        return createJsonResponse({ error: 'Invalid or incomplete JSON payload for agent creation', details: jsonError.message }, 400);
      }

      // 1. Prepare agent data for insertion (excluding knowledge_document_ids)
      const { knowledge_document_ids: knowledgeIdsToLink, ...agentPayload } = payload;
      // Explicitly include is_enabled in the intersection type
      const agentToCreate: Omit<BaseAIAgent, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id: string; is_enabled?: boolean } = {
        name: agentPayload.name,
        prompt: agentPayload.prompt,
        keyword_trigger: agentPayload.keyword_trigger || null,
        is_enabled: agentPayload.is_enabled ?? true,
        user_id: userId,
      };

      // 2. Insert into ai_agents table
      const { data: newAgentData, error: agentInsertError } = await supabase
        .from('ai_agents')
        .insert(agentToCreate)
        .select() // Select all columns from the newly created agent
        .single();

      if (agentInsertError) {
        console.error(`[${requestStartTime}] Create Agent DB Error (Agent Insert):`, agentInsertError.message);
        return createJsonResponse({ error: 'Failed to create AI agent', details: agentInsertError.message }, 500);
      }
      if (!newAgentData) {
         console.error(`[${requestStartTime}] Create Agent DB Error: No data returned after insert (unexpected).`);
         return createJsonResponse({ error: 'Failed to create AI agent, no data returned.' }, 500);
      }

      // 3. Log received knowledge IDs for Create
      const knowledgeDocIdsToLink = knowledgeIdsToLink || [];
      console.log(`[${requestStartTime}] Create Agent (ID: ${newAgentData.id}): Received knowledge_document_ids: [${knowledgeDocIdsToLink.join(', ')}]`);

      // 4. Insert integrations if provided
      const integrationIdsToLink = payload.integration_ids || [];
      let integrationInsertError: Error | null = null;
      if (integrationIdsToLink.length > 0) {
        const newIntegrationLinks = integrationIdsToLink.map(intId => ({
          agent_id: newAgentData.id,
          integration_id: intId,
        }));
        const { error: insertError } = await supabase
          .from('ai_agent_integrations')
          .insert(newIntegrationLinks);

        if (insertError) {
          console.error(`[${requestStartTime}] Create Agent Warning (Insert Integrations - ID: ${newAgentData.id}):`, insertError.message);
          integrationInsertError = new Error('Failed to link integrations during agent creation');
        }
      }

      // 5. Insert knowledge document links if provided
      // const knowledgeDocIdsToLink = knowledgeIdsToLink || []; // Already defined above
      let knowledgeInsertError: Error | null = null;
      if (knowledgeDocIdsToLink.length > 0) {
        const newKnowledgeLinks = knowledgeDocIdsToLink.map(docId => ({
          agent_id: newAgentData.id, // Use the newly created agent's ID
          document_id: docId,
        }));
        console.log(`[${requestStartTime}] Create Agent (ID: ${newAgentData.id}): Attempting to insert knowledge links:`, JSON.stringify(newKnowledgeLinks));
        const { error: insertError } = await supabase
          .from('ai_agent_knowledge_documents')
          .insert(newKnowledgeLinks);

        if (insertError) {
          console.error(`[${requestStartTime}] Create Agent DB Error (Insert Knowledge Links - ID: ${newAgentData.id}):`, insertError.message);
          knowledgeInsertError = new Error('Failed to link knowledge documents during agent creation');
        } else {
          console.log(`[${requestStartTime}] Create Agent (ID: ${newAgentData.id}): Successfully inserted knowledge links.`);
        }
      } else {
         console.log(`[${requestStartTime}] Create Agent (ID: ${newAgentData.id}): No knowledge documents provided to link.`);
      }

      // 6. Return combined data
      // Remove the old knowledge_document_ids column if it exists on the newAgentData object
      const { knowledge_document_ids, ...baseNewAgentData } = newAgentData;
      const finalAgentResponse = {
        ...baseNewAgentData,
        integration_ids: integrationIdsToLink,
        knowledge_document_ids: knowledgeDocIdsToLink,
      };
      console.log(`[${requestStartTime}] Created agent: ${finalAgentResponse.name} (ID: ${finalAgentResponse.id}) for user ${userId}`);
      if (integrationInsertError || knowledgeInsertError) {
         console.warn(`[${requestStartTime}] Create Agent completed with errors for agent ID ${finalAgentResponse.id}: IntegrationError=${integrationInsertError?.message}, KnowledgeError=${knowledgeInsertError?.message}`);
      }
      return createJsonResponse({ agent: finalAgentResponse as AgentWithDetails }, 201); // 201 Created
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

      // Separate knowledge IDs from the main payload
      const { knowledge_document_ids: knowledgeIdsToUpdate, ...agentPayload } = payload;
      console.log(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Received knowledge_document_ids for update: [${(knowledgeIdsToUpdate || []).join(', ')}]`); // Log received IDs

      // Prepare update object for ai_agents table (excluding knowledge_document_ids)
      const agentToUpdate: Partial<BaseAIAgent & { is_enabled?: boolean }> = {};
      if (agentPayload.name !== undefined) agentToUpdate.name = agentPayload.name;
      if (agentPayload.prompt !== undefined) agentToUpdate.prompt = agentPayload.prompt;
      if (agentPayload.keyword_trigger !== undefined) agentToUpdate.keyword_trigger = agentPayload.keyword_trigger;
      if (agentPayload.is_enabled !== undefined) agentToUpdate.is_enabled = agentPayload.is_enabled;

      // 1. Update the agent table (only if there are fields to update)
      let updatedAgentData: BaseAIAgent | null = null;
      if (Object.keys(agentToUpdate).length > 0) {
        const { data, error: agentUpdateError } = await supabase
          .from('ai_agents')
          .update(agentToUpdate)
          .eq('id', agentIdFromPath)
          .eq('user_id', userId)
          .select('*') // Select all columns from ai_agents
          .single();

        if (agentUpdateError) {
          console.error(`[${requestStartTime}] Update Agent DB Error (Agent Update - ID: ${agentIdFromPath}):`, agentUpdateError.message);
          const status = agentUpdateError.code === 'PGRST116' ? 404 : 500;
          const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to update AI agent';
          return createJsonResponse({ error: message, details: agentUpdateError.message }, status);
        }
        if (!data) {
           console.warn(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Agent not found after successful update (unexpected).`);
           return createJsonResponse({ error: 'AI Agent not found after update attempt' }, 404);
        }
        // Remove the old knowledge_document_ids column if it exists on the returned data
        const { knowledge_document_ids, ...baseData } = data;
        updatedAgentData = baseData;
      } else {
        // If only links are being updated, fetch the current agent data
        const { data, error: fetchError } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('id', agentIdFromPath)
          .eq('user_id', userId)
          .single();
         if (fetchError || !data) {
            console.error(`[${requestStartTime}] Update Agent DB Error (Fetch Agent - ID: ${agentIdFromPath}):`, fetchError?.message);
            return createJsonResponse({ error: 'AI Agent not found or could not be fetched for update' }, 404);
         }
         const { knowledge_document_ids, ...baseData } = data;
         updatedAgentData = baseData;
      }

      // 2. Update integrations if provided
      let finalIntegrationIds: string[] = [];
      let integrationUpdateError: Error | null = null;
      if (payload.integration_ids !== undefined) {
         finalIntegrationIds = payload.integration_ids || [];
         // Delete existing integrations
         const { error: deleteError } = await supabase.from('ai_agent_integrations').delete().eq('agent_id', agentIdFromPath);
         if (deleteError) {
            console.error(`[${requestStartTime}] Update Agent Warning (Delete Integrations - ID: ${agentIdFromPath}):`, deleteError.message);
            integrationUpdateError = new Error('Failed to clear existing agent integrations');
         } else if (finalIntegrationIds.length > 0) {
            // Insert new integrations
            const links = finalIntegrationIds.map(id => ({ agent_id: agentIdFromPath, integration_id: id }));
            const { error: insertError } = await supabase.from('ai_agent_integrations').insert(links);
            if (insertError) {
               console.error(`[${requestStartTime}] Update Agent Warning (Insert Integrations - ID: ${agentIdFromPath}):`, insertError.message);
               integrationUpdateError = new Error('Failed to insert new agent integrations');
            } else {
               console.log(`[${requestStartTime}] Updated integrations for agent (ID: ${agentIdFromPath}) to: [${finalIntegrationIds.join(', ')}]`);
            }
         }
      } else {
         // Fetch existing if not provided in payload
         const { data, error } = await supabase.from('ai_agent_integrations').select('integration_id').eq('agent_id', agentIdFromPath);
         if (error) {
            console.error(`[${requestStartTime}] Update Agent Warning (Fetch Integrations - ID: ${agentIdFromPath}):`, error.message);
            integrationUpdateError = new Error('Failed to fetch current integrations');
         } else {
            finalIntegrationIds = data ? data.map(link => link.integration_id) : [];
         }
      }

      // 3. Update knowledge document links if provided
      let finalKnowledgeDocIds: string[] = [];
      let knowledgeUpdateError: Error | null = null;
      if (knowledgeIdsToUpdate !== undefined) { // Only update links if the key was present in the payload
         finalKnowledgeDocIds = knowledgeIdsToUpdate || []; // Use the provided IDs (or empty array if null/empty)
         // Delete existing links first
         console.log(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Attempting to delete existing knowledge links...`);
         const { error: deleteError } = await supabase.from('ai_agent_knowledge_documents').delete().eq('agent_id', agentIdFromPath);

         if (deleteError) {
            console.error(`[${requestStartTime}] Update Agent DB Error (Delete Knowledge Links - ID: ${agentIdFromPath}):`, deleteError.message);
            knowledgeUpdateError = new Error('Failed to clear existing knowledge document links');
            // Decide if we should proceed if delete fails? For now, we will, but log the error.
         } else {
             console.log(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Successfully deleted existing knowledge links.`);
         }

         // Insert new links only if there are IDs to insert and delete didn't fail catastrophically (or we decide to proceed anyway)
         if (finalKnowledgeDocIds.length > 0 && !knowledgeUpdateError) { // Added check for knowledgeUpdateError
            const newLinks = finalKnowledgeDocIds.map(id => ({ agent_id: agentIdFromPath, document_id: id }));
            console.log(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Attempting to insert new knowledge links:`, JSON.stringify(newLinks));
            const { error: insertError } = await supabase.from('ai_agent_knowledge_documents').insert(newLinks);
            if (insertError) {
               console.error(`[${requestStartTime}] Update Agent DB Error (Insert Knowledge Links - ID: ${agentIdFromPath}):`, insertError.message);
               knowledgeUpdateError = new Error('Failed to insert new knowledge document links'); // Overwrite or append error? Append for now.
            } else {
               console.log(`[${requestStartTime}] Update Agent (ID: ${agentIdFromPath}): Successfully inserted new knowledge links: [${finalKnowledgeDocIds.join(', ')}]`);
            }
         }
      } else {
         // Fetch existing if not provided in payload
         const { data, error } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);
         if (error) {
            console.error(`[${requestStartTime}] Update Agent Warning (Fetch Knowledge Links - ID: ${agentIdFromPath}):`, error.message);
            knowledgeUpdateError = new Error('Failed to fetch current knowledge links');
         } else {
            finalKnowledgeDocIds = data ? data.map(link => link.document_id) : [];
         }
      }

      // 4. Return combined data
      const finalAgentResponse = {
        ...updatedAgentData, // This is BaseAIAgent type now
        integration_ids: finalIntegrationIds,
        knowledge_document_ids: finalKnowledgeDocIds,
      };
      console.log(`[${requestStartTime}] Updated agent: ${finalAgentResponse.name} (ID: ${agentIdFromPath}) for user ${userId}`);
      if (integrationUpdateError || knowledgeUpdateError) {
         console.warn(`[${requestStartTime}] Update Agent completed with errors for agent ID ${agentIdFromPath}: IntegrationError=${integrationUpdateError?.message}, KnowledgeError=${knowledgeUpdateError?.message}`);
      }
      return createJsonResponse({ agent: finalAgentResponse as AgentWithDetails }, 200);
    }

    // --- DELETE AGENT (DELETE /:id) ---
    else if (req.method === 'DELETE' && agentIdFromPath) {
      console.log(`[${requestStartTime}] Routing to: Delete Agent (REST - ID: ${agentIdFromPath})`);
       // Ensure userId is available for REST API calls
       if (!userId) {
         console.error(`[${requestStartTime}] Auth Error: userId is null for DELETE call.`);
         return createJsonResponse({ error: 'User authentication required for this operation' }, 401);
       }
      // Deleting the agent will cascade delete links in join tables due to FK constraints
      const { error: deleteError } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentIdFromPath)
        .eq('user_id', userId);

      if (deleteError) {
        console.error(`[${requestStartTime}] Delete Agent DB Error (ID: ${agentIdFromPath}):`, deleteError.message);
        // Check if error is "not found" vs other DB error
        if (deleteError.code !== 'PGRST116') { // PGRST116: Row not found
           return createJsonResponse({ error: 'Failed to delete AI agent', details: deleteError.message }, 500);
        }
         console.warn(`[${requestStartTime}] Delete Agent (ID: ${agentIdFromPath}): Agent not found (PGRST116), proceeding with 204.`);
      }

      console.log(`[${requestStartTime}] Deleted agent (ID: ${agentIdFromPath}) or agent did not exist for user ${userId}.`);
      return createJsonResponse(null, 204); // 204 No Content
    }

    // --- METHOD/ROUTE NOT ALLOWED ---
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
