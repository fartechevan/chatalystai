import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

// Define types based on database schema and expected payloads
type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

interface NewAgentPayload {
  name: string;
  prompt: string;
  knowledge_document_ids?: string[];
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  knowledge_document_ids?: string[];
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
      const { data: agents, error: fetchError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error(`[${requestStartTime}] List Agents Error:`, fetchError.message);
        return createJsonResponse({ error: 'Failed to fetch AI agents', details: fetchError.message }, 500);
      }
      console.log(`[${requestStartTime}] Found ${agents?.length ?? 0} agents for user ${user.id}`);
      return createJsonResponse({ agents: agents as AIAgent[] }, 200);
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
        knowledge_document_ids: payload.knowledge_document_ids || null,
      };

      const { data: newAgent, error: insertError } = await supabase
        .from('ai_agents')
        .insert(agentToInsert)
        .select()
        .single();

      if (insertError) {
         console.error(`[${requestStartTime}] Create Agent DB Error:`, insertError.message);
         return createJsonResponse({ error: 'Failed to create AI agent', details: insertError.message }, 500);
      }
      console.log(`[${requestStartTime}] Created agent with ID: ${newAgent.id} for user ${user.id}`);
      return createJsonResponse({ agent: newAgent as AIAgent }, 201);
    }

    // --- GET AGENT (GET /:id) ---
    else if (req.method === 'GET' && agentId) {
      console.log(`[${requestStartTime}] Routing to: Get Agent (ID: ${agentId})`);
       const { data: agent, error: fetchError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', user.id) // RLS also enforces this, but good practice
        .single();

       if (fetchError) {
         console.error(`[${requestStartTime}] Get Agent Error (ID: ${agentId}):`, fetchError.message);
         const status = fetchError.code === 'PGRST116' ? 404 : 500;
         const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to fetch AI agent';
         return createJsonResponse({ error: message, details: fetchError.message }, status);
       }

       // PGRST116 should cover not found, but double-check
       if (!agent) {
         console.warn(`[${requestStartTime}] Get Agent (ID: ${agentId}): Agent not found after successful query (unexpected).`);
         return createJsonResponse({ error: 'AI Agent not found' }, 404);
       }

       console.log(`[${requestStartTime}] Found agent: ${agent.name} (ID: ${agentId}) for user ${user.id}`);
       return createJsonResponse({ agent: agent as AIAgent }, 200);
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
      // 'updated_at' is handled by the database trigger

      const { data: updatedAgent, error: updateError } = await supabase
        .from('ai_agents')
        .update(agentToUpdate)
        .eq('id', agentId)
        .eq('user_id', user.id) // RLS also enforces this
        .select()
        .single();

      if (updateError) {
        console.error(`[${requestStartTime}] Update Agent DB Error (ID: ${agentId}):`, updateError.message);
        const status = updateError.code === 'PGRST116' ? 404 : 500;
        const message = status === 404 ? 'AI Agent not found or access denied' : 'Failed to update AI agent';
        return createJsonResponse({ error: message, details: updateError.message }, status);
      }

      // PGRST116 should cover not found, but double-check
      if (!updatedAgent) {
         console.warn(`[${requestStartTime}] Update Agent (ID: ${agentId}): Agent not found after successful update (unexpected).`);
         return createJsonResponse({ error: 'AI Agent not found after update attempt' }, 404);
      }

      console.log(`[${requestStartTime}] Updated agent: ${updatedAgent.name} (ID: ${agentId}) for user ${user.id}`);
      return createJsonResponse({ agent: updatedAgent as AIAgent }, 200);
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
