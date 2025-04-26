import { serve } from 'std/http/server.ts'; // Use mapped path
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

// Define types based on database schema and expected payloads
type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

interface NewAgentPayload {
  name: string;
  prompt: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integration_ids?: string[]; // Added
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integration_ids?: string[]; // Added
}

// Helper function to create consistent JSON responses with CORS headers
function createJsonResponse(body: unknown, status: number = 200) {
  // For 204 No Content, body should be null
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = { ...corsHeaders };
  if (status !== 204) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(responseBody, { status, headers });
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
    // --- Authentication ---
    const supabase = createSupabaseClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(`[${requestStartTime}] Auth Error:`, userError?.message || 'User not found');
      return createJsonResponse({ error: 'User authentication failed' }, 401);
    }
    console.log(`[${requestStartTime}] Authenticated user: ${user.id}`);

    // --- Routing Logic ---
    const url = new URL(req.url);
    // Extract path segments *after* the function name (ai-agent-handler)
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const functionNameIndex = pathSegments.indexOf('ai-agent-handler');
    const relevantPathSegments = functionNameIndex !== -1 ? pathSegments.slice(functionNameIndex + 1) : [];
    const agentId = relevantPathSegments.length === 1 ? relevantPathSegments[0] : null;

    console.log(`[${requestStartTime}] Parsed agentId: ${agentId}`);

    // --- LIST AGENTS (GET /) ---
    if (req.method === 'GET' && !agentId) {
      console.log(`[${requestStartTime}] Routing to: List Agents`);
      // 1. Fetch base agent data
      const { data: agentsData, error: fetchAgentsError } = await supabase
        .from('ai_agents')
        .select('*') // Select all agent fields now that types should be correct
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchAgentsError) {
        console.error(`[${requestStartTime}] List Agents Error (Agents):`, fetchAgentsError.message);
        return createJsonResponse({ error: 'Failed to fetch AI agents', details: fetchAgentsError.message }, 500);
      }

      if (!agentsData || agentsData.length === 0) {
        console.log(`[${requestStartTime}] No agents found for user ${user.id}`);
        return createJsonResponse({ agents: [] }, 200);
      }

      // 2. Fetch integrations for all fetched agents
      const agentIds = agentsData.map(a => a.id);
      const { data: integrationsData, error: fetchIntegrationsError } = await supabase
        .from('ai_agent_integrations')
        .select('agent_id, integration_id')
        .in('agent_id', agentIds);

      if (fetchIntegrationsError) {
         // Log the error but proceed, returning agents without integrations if this fails
         console.error(`[${requestStartTime}] List Agents Warning (Integrations):`, fetchIntegrationsError.message);
         // Return agents without integrations in case of error fetching links
         const agentsWithoutIntegrations = agentsData.map(agent => ({
            ...agent,
            integration_ids: [], // Default to empty array on error
         }));
         return createJsonResponse({ agents: agentsWithoutIntegrations as any[] }, 200);
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
        integration_ids: integrationsMap.get(agent.id) || [], // Add integration_ids array
      }));

      console.log(`[${requestStartTime}] Found ${agentsWithIntegrations.length} agents with integrations for user ${user.id}`);
      // Use 'any[]' cast as frontend type expects integration_ids which might not be in backend AIAgent type
      return createJsonResponse({ agents: agentsWithIntegrations as any[] }, 200);
    }

    // --- CREATE AGENT (POST /) ---
    else if (req.method === 'POST' && !agentId) {
      console.log(`[${requestStartTime}] Routing to: Create Agent`);
      let payload: NewAgentPayload;
      try {
        payload = await req.json();
      } catch (jsonError) {
        console.error(`[${requestStartTime}] Create Agent JSON Parse Error:`, jsonError.message);
        return createJsonResponse({ error: 'Invalid JSON payload', details: jsonError.message }, 400);
      }

      if (!payload.name || !payload.prompt) {
         console.warn(`[${requestStartTime}] Create Agent Bad Request: Missing name or prompt`);
         return createJsonResponse({ error: 'Missing required fields: name and prompt' }, 400);
      }

      const agentToInsert = {
        user_id: user.id,
        name: payload.name,
        prompt: payload.prompt,
        keyword_trigger: payload.keyword_trigger || null, // Added
        knowledge_document_ids: payload.knowledge_document_ids || null,
      };

      // Perform operations sequentially (no transaction)
      // 1. Insert the agent
      const { data: insertedAgent, error: agentInsertError } = await supabase
        .from('ai_agents')
        .insert(agentToInsert)
        .select()
        .single();

      if (agentInsertError) {
        console.error(`[${requestStartTime}] Create Agent DB Error (Agent Insert):`, agentInsertError.message);
        return createJsonResponse({ error: 'Failed to insert agent', details: agentInsertError.message }, 500);
      }
      if (!insertedAgent) {
         console.error(`[${requestStartTime}] Create Agent DB Error: No agent data returned after insert.`);
         return createJsonResponse({ error: 'Failed to retrieve created agent data' }, 500);
      }

      // 2. Insert integrations if provided
      let integrationIds: string[] = [];
      if (payload.integration_ids && payload.integration_ids.length > 0) {
        integrationIds = payload.integration_ids;
        const integrationLinks = integrationIds.map(intId => ({
          agent_id: insertedAgent.id,
          integration_id: intId,
        }));

        const { error: integrationInsertError } = await supabase
          .from('ai_agent_integrations')
          .insert(integrationLinks);

        if (integrationInsertError) {
          // Log error but don't fail the whole request, agent was created
          console.error(`[${requestStartTime}] Create Agent Warning (Integrations Insert):`, integrationInsertError.message);
          // Proceed without integrations in the response
          integrationIds = []; // Reset integrationIds as they failed to insert
        }
      }

      // 3. Return the complete agent data (potentially without integrations if insert failed)
      const newAgentResponse = { ...insertedAgent, integration_ids: integrationIds };
      console.log(`[${requestStartTime}] Created agent with ID: ${newAgentResponse.id} for user ${user.id}`);
      // Use 'as any' for response due to added integration_ids
      return createJsonResponse({ agent: newAgentResponse as any }, 201);
    }

    // --- GET AGENT (GET /:id) ---
    else if (req.method === 'GET' && agentId) {
      console.log(`[${requestStartTime}] Routing to: Get Agent (ID: ${agentId})`);

      // 1. Fetch agent data
      const { data: agentData, error: agentFetchError } = await supabase
        .from('ai_agents')
        .select('*') // Select all columns now
        .eq('id', agentId)
        .eq('user_id', user.id) // RLS also enforces this
        .single();

      if (agentFetchError) {
        console.error(`[${requestStartTime}] Get Agent Error (Agent Fetch - ID: ${agentId}):`, agentFetchError.message);
        const status = agentFetchError.code === 'PGRST116' ? 404 : 500;
        const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to fetch AI agent';
        return createJsonResponse({ error: message, details: agentFetchError.message }, status);
      }
      if (!agentData) {
         // Should be caught by PGRST116, but as fallback
         console.warn(`[${requestStartTime}] Get Agent (ID: ${agentId}): Agent not found after successful query (unexpected).`);
         return createJsonResponse({ error: 'AI Agent not found' }, 404);
      }

      // 2. Fetch integrations
      let integrationIds: string[] = [];
      const { data: integrationsData, error: integrationsFetchError } = await supabase
        .from('ai_agent_integrations')
        .select('integration_id')
        .eq('agent_id', agentId);

      if (integrationsFetchError) {
         // Log error but proceed, returning agent without integrations
         console.error(`[${requestStartTime}] Get Agent Warning (Integrations Fetch - ID: ${agentId}):`, integrationsFetchError.message);
      } else if (integrationsData) {
         integrationIds = integrationsData.map(link => link.integration_id);
      }

      // 3. Combine data
      const agentWithIntegrations = { ...agentData, integration_ids: integrationIds };

      console.log(`[${requestStartTime}] Found agent: ${agentWithIntegrations.name} (ID: ${agentId}) with ${agentWithIntegrations.integration_ids.length} integrations for user ${user.id}`);
      // Use 'as any' for the response object to avoid potential type conflicts
      return createJsonResponse({ agent: agentWithIntegrations as any }, 200);
    }

    // --- UPDATE AGENT (PUT /:id or PATCH /:id) ---
    else if ((req.method === 'PUT' || req.method === 'PATCH') && agentId) {
      console.log(`[${requestStartTime}] Routing to: Update Agent (ID: ${agentId})`);
      let payload: UpdateAgentPayload;
       try {
        payload = await req.json();
      } catch (jsonError) {
        console.error(`[${requestStartTime}] Update Agent JSON Parse Error (ID: ${agentId}):`, jsonError.message);
        return createJsonResponse({ error: 'Invalid JSON payload', details: jsonError.message }, 400);
      }

      if (Object.keys(payload).length === 0) {
         console.warn(`[${requestStartTime}] Update Agent Bad Request (ID: ${agentId}): No update fields provided`);
         return createJsonResponse({ error: 'No update fields provided' }, 400);
      }

      const agentToUpdate: Partial<AIAgent> = {};
      if (payload.name !== undefined) agentToUpdate.name = payload.name;
      if (payload.prompt !== undefined) agentToUpdate.prompt = payload.prompt;
      if (payload.knowledge_document_ids !== undefined) {
        agentToUpdate.knowledge_document_ids = payload.knowledge_document_ids;
      }
      if (payload.keyword_trigger !== undefined) { // Added
        agentToUpdate.keyword_trigger = payload.keyword_trigger;
      }
      // 'updated_at' is handled by the database trigger for ai_agents

      // Perform operations sequentially (no transaction)
      // 1. Update the agent table
      const { data: updatedAgentData, error: agentUpdateError } = await supabase
        .from('ai_agents')
        .update(agentToUpdate)
        .eq('id', agentId)
        .eq('user_id', user.id) // RLS also enforces this
        .select()
        .single();

      if (agentUpdateError) {
        console.error(`[${requestStartTime}] Update Agent DB Error (Agent Update - ID: ${agentId}):`, agentUpdateError.message);
        const status = agentUpdateError.code === 'PGRST116' ? 404 : 500;
        const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to update AI agent';
        return createJsonResponse({ error: message, details: agentUpdateError.message }, status);
      }
      if (!updatedAgentData) {
         console.warn(`[${requestStartTime}] Update Agent (ID: ${agentId}): Agent not found after successful update (unexpected).`);
         return createJsonResponse({ error: 'AI Agent not found after update attempt' }, 404);
      }

      // 2. Update integrations if provided
      let finalIntegrationIds: string[] = [];
      let integrationUpdateError: Error | null = null;

      if (payload.integration_ids !== undefined) {
         finalIntegrationIds = payload.integration_ids || []; // Use provided list or empty if null/undefined

         // Delete existing integrations for this agent
         const { error: deleteIntegrationsError } = await supabase
           .from('ai_agent_integrations')
           .delete()
           .eq('agent_id', agentId);

         if (deleteIntegrationsError) {
            console.error(`[${requestStartTime}] Update Agent Warning (Delete Integrations - ID: ${agentId}):`, deleteIntegrationsError.message);
            integrationUpdateError = new Error('Failed to clear existing agent integrations');
            // Continue, but integrations might be inconsistent
         } else if (finalIntegrationIds.length > 0) {
            // Insert new integrations if the list is not empty and delete was successful
            const newIntegrationLinks = finalIntegrationIds.map(intId => ({
              agent_id: agentId,
              integration_id: intId,
            }));
            const { error: insertIntegrationsError } = await supabase
              .from('ai_agent_integrations')
              .insert(newIntegrationLinks);

            if (insertIntegrationsError) {
              console.error(`[${requestStartTime}] Update Agent Warning (Insert Integrations - ID: ${agentId}):`, insertIntegrationsError.message);
              integrationUpdateError = new Error('Failed to insert new agent integrations');
              // Continue, but integrations might be inconsistent
            } else {
               console.log(`[${requestStartTime}] Updated integrations for agent (ID: ${agentId}) to: [${finalIntegrationIds.join(', ')}]`);
            }
         }
      } else {
         // If integration_ids was *not* in the payload, fetch existing ones to return the current state
          const { data: currentIntegrations, error: fetchCurrentIntegrationsError } = await supabase
            .from('ai_agent_integrations')
            .select('integration_id')
            .eq('agent_id', agentId);

          if (fetchCurrentIntegrationsError) {
             console.error(`[${requestStartTime}] Update Agent Warning (Fetch Current Integrations - ID: ${agentId}):`, fetchCurrentIntegrationsError.message);
             integrationUpdateError = new Error('Failed to fetch current integrations after update');
             // Continue, but integrations might be missing from response
          } else {
             finalIntegrationIds = currentIntegrations ? currentIntegrations.map(link => link.integration_id) : [];
          }
      }

      // 3. Return combined data (even if integration update had issues)
      const finalAgentResponse = { ...updatedAgentData, integration_ids: finalIntegrationIds };
      console.log(`[${requestStartTime}] Updated agent: ${finalAgentResponse.name} (ID: ${agentId}) for user ${user.id}`);
      if (integrationUpdateError) {
         console.warn(`[${requestStartTime}] Update Agent completed with integration errors for agent ID ${agentId}: ${integrationUpdateError.message}`);
      }
      // Use 'as any' for response due to added integration_ids
      return createJsonResponse({ agent: finalAgentResponse as any }, 200);
    }

    // --- DELETE AGENT (DELETE /:id) ---
    else if (req.method === 'DELETE' && agentId) {
      console.log(`[${requestStartTime}] Routing to: Delete Agent (ID: ${agentId})`);
      const { error: deleteError } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentId)
        .eq('user_id', user.id); // RLS also enforces this

      if (deleteError) {
        console.error(`[${requestStartTime}] Delete Agent DB Error (ID: ${agentId}):`, deleteError.message);
        // Note: PGRST116 (Not Found) is often NOT treated as an error for DELETE,
        // as the desired state (resource doesn't exist) is achieved.
        // We return 204 even if it didn't exist. Only return 500 for other errors.
        if (deleteError.code !== 'PGRST116') {
           return createJsonResponse({ error: 'Failed to delete AI agent', details: deleteError.message }, 500);
        }
         console.warn(`[${requestStartTime}] Delete Agent (ID: ${agentId}): Agent not found (PGRST116), proceeding with 204.`);
      }

      console.log(`[${requestStartTime}] Deleted agent (ID: ${agentId}) or agent did not exist for user ${user.id}.`);
      return createJsonResponse(null, 204); // 204 No Content
    }

    // --- METHOD/ROUTE NOT ALLOWED ---
    else {
      console.warn(`[${requestStartTime}] Method Not Allowed: ${req.method} for path with agentId=${agentId}`);
      return createJsonResponse({ error: 'Method Not Allowed for this route combination' }, 405);
    }

  } catch (error) {
    // Catch unexpected errors (e.g., issues within shared modules)
    console.error(`[${requestStartTime}] Unhandled Top-Level Error:`, error.message, error.stack);
    return createJsonResponse({ error: 'Internal server error', details: error.message }, 500);
  } finally {
      const requestEndTime = Date.now();
      console.log(`[${requestStartTime}] Request finished in ${requestEndTime - requestStartTime}ms`);
  }
});
