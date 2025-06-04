import { serve } from 'std/http/server.ts'; // Use import map
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';
import OpenAI from "openai"; // Use mapped import from import_map.json

// Define types based on database schema and expected payloads
type AIAgentDbRow = Database['public']['Tables']['ai_agents']['Row'];

interface NewAgentPayload {
  name: string;
  prompt: string; 
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integration_ids?: string[];
  is_enabled?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  agent_type?: 'chattalyst' | 'n8n';
  n8n_webhook_url?: string | null;
}

interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  knowledge_document_ids?: string[];
  integration_ids?: string[];
  is_enabled?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  agent_type?: 'chattalyst' | 'n8n';
  n8n_webhook_url?: string | null;
}

interface AgentWithDetails extends AIAgentDbRow { 
  integration_ids: string[]; 
  knowledge_document_ids: string[];
}

// Explicit type for data to be inserted into ai_agents table
interface AgentForCreate {
  name: string;
  prompt: string;
  keyword_trigger: string | null;
  is_enabled: boolean;
  activation_mode: 'keyword' | 'always_on';
  agent_type: 'chattalyst' | 'n8n';
  n8n_webhook_url: string | null;
  user_id: string;
}
// Explicit type for data to be used in updating ai_agents table
interface AgentForUpdate {
  name?: string;
  prompt?: string;
  keyword_trigger?: string | null;
  is_enabled?: boolean;
  activation_mode?: 'keyword' | 'always_on';
  agent_type?: 'chattalyst' | 'n8n';
  n8n_webhook_url?: string | null;
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
    const supabase = createSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const functionNameIndex = pathSegments.indexOf('ai-agent-handler');
    const relevantPathSegments = functionNameIndex !== -1 ? pathSegments.slice(functionNameIndex + 1) : [];
    const agentIdFromPath = relevantPathSegments.length === 1 ? relevantPathSegments[0] : null;

    // --- REST API Calls ---
    
    // --- CREATE AGENT (POST /) ---
    if (req.method === 'POST' && !agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required for creating an agent' }, 401);
      console.log(`[${requestStartTime}] Routing to: Create Agent (REST)`);
      
      let payload: NewAgentPayload;
      try {
        payload = await req.json();
        if (!payload.name || 
            (payload.agent_type === 'chattalyst' && (payload.prompt === undefined || payload.prompt.trim() === '')) || 
            (payload.agent_type === 'n8n' && !payload.n8n_webhook_url) // Simplified check for n8n_webhook_url
           ) {
          throw new Error("Missing required fields: name, and prompt (for chattalyst) or n8n_webhook_url (for n8n)");
        }
      } catch (jsonError) {
        return createJsonResponse({ error: 'Invalid payload for agent creation', details: (jsonError as Error).message }, 400);
      }

      const { knowledge_document_ids: knowledgeIdsToLink, integration_ids: integrationIdsToLink, ...agentCorePayload } = payload;
      
      const agentToCreateData: AgentForCreate = { // Use explicit AgentForCreate type
        name: agentCorePayload.name,
        prompt: (agentCorePayload.agent_type === 'chattalyst' && agentCorePayload.prompt) ? agentCorePayload.prompt : '',
        keyword_trigger: agentCorePayload.keyword_trigger || null,
        is_enabled: agentCorePayload.is_enabled ?? true,
        activation_mode: agentCorePayload.activation_mode || 'keyword',
        agent_type: agentCorePayload.agent_type || 'chattalyst',
        n8n_webhook_url: (agentCorePayload.agent_type === 'n8n' && agentCorePayload.n8n_webhook_url) ? agentCorePayload.n8n_webhook_url : null,
        user_id: userId!, 
      };

      const { data: newAgent, error: agentInsertError } = await supabase
        .from('ai_agents').insert(agentToCreateData).select().single<AIAgentDbRow>(); // Removed 'as any'
      if (agentInsertError) {
        console.error("DB Insert Error:", agentInsertError); 
        return createJsonResponse({ error: 'Failed to create agent in database', details: agentInsertError.message }, 500);
      }
      if (!newAgent) return createJsonResponse({ error: 'Failed to create agent, no data returned after insert' }, 500);

      if (knowledgeIdsToLink && knowledgeIdsToLink.length > 0) {
        const links = knowledgeIdsToLink.map(docId => ({ agent_id: newAgent.id, document_id: docId }));
        await supabase.from('ai_agent_knowledge_documents').insert(links);
      }
      if (integrationIdsToLink && integrationIdsToLink.length > 0) {
        const links = integrationIdsToLink.map(intId => ({ agent_id: newAgent.id, integration_id: intId }));
        await supabase.from('ai_agent_integrations').insert(links);
      }
      
      const responseAgent: AgentWithDetails = {
        ...newAgent,
        integration_ids: integrationIdsToLink || [],
        knowledge_document_ids: knowledgeIdsToLink || [],
      };
      return createJsonResponse({ agent: responseAgent }, 201);
    }
    // --- LIST AGENTS (GET /) ---
    else if (req.method === 'GET' && !agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      console.log(`[${requestStartTime}] Routing to: List Agents (REST)`);
      const { data: agentsData, error: fetchAgentsError } = await supabase
        .from('ai_agents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (fetchAgentsError) return createJsonResponse({ error: 'Failed to fetch agents', details: fetchAgentsError.message }, 500);
      if (!agentsData) return createJsonResponse({ agents: [] }, 200);

      const agentIds = agentsData.map(a => a.id);
      const { data: integrationsData } = await supabase.from('ai_agent_integrations').select('agent_id, integration_id').in('agent_id', agentIds);
      const { data: knowledgeLinksData } = await supabase.from('ai_agent_knowledge_documents').select('agent_id, document_id').in('agent_id', agentIds);
      
      const integrationsMap = new Map<string, string[]>();
      if (integrationsData) integrationsData.forEach(link => integrationsMap.set(link.agent_id, [...(integrationsMap.get(link.agent_id) || []), link.integration_id]));
      const knowledgeLinksMap = new Map<string, string[]>();
      if (knowledgeLinksData) knowledgeLinksData.forEach(link => knowledgeLinksMap.set(link.agent_id, [...(knowledgeLinksMap.get(link.agent_id) || []), link.document_id]));

      const agentsWithDetails: AgentWithDetails[] = agentsData.map(agent => ({
        ...agent,
        integration_ids: integrationsMap.get(agent.id) || [],
        knowledge_document_ids: knowledgeLinksMap.get(agent.id) || [],
      }));
      return createJsonResponse({ agents: agentsWithDetails }, 200);
    }
    // --- GET AGENT (GET /:id) ---
    else if (req.method === 'GET' && agentIdFromPath) {
      if (!userId) return createJsonResponse({ error: 'User authentication required' }, 401);
      console.log(`[${requestStartTime}] Routing to: Get Agent (REST - ID: ${agentIdFromPath})`);
      const { data: agentData, error: agentFetchError } = await supabase
        .from('ai_agents').select('*').eq('id', agentIdFromPath).eq('user_id', userId).single<AIAgentDbRow>();
      if (agentFetchError) return createJsonResponse({ error: 'Agent not found', details: agentFetchError.message }, agentFetchError.code === 'PGRST116' ? 404 : 500);
      if (!agentData) return createJsonResponse({ error: 'Agent not found' }, 404);

      const { data: integrationsData } = await supabase.from('ai_agent_integrations').select('integration_id').eq('agent_id', agentIdFromPath);
      const { data: knowledgeLinksData } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);
      
      const agentWithDetails: AgentWithDetails = {
        ...agentData,
        integration_ids: integrationsData?.map(link => link.integration_id) || [],
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

      const { knowledge_document_ids: knowledgeIdsToUpdate, integration_ids: integrationIdsToUpdate, ...agentCorePayload } = payload;
      
      const agentToUpdateData: AgentForUpdate = {}; // Using the explicitly defined interface

      if (agentCorePayload.name !== undefined) agentToUpdateData.name = agentCorePayload.name;
      if (agentCorePayload.keyword_trigger !== undefined) agentToUpdateData.keyword_trigger = agentCorePayload.keyword_trigger;
      if (agentCorePayload.is_enabled !== undefined) agentToUpdateData.is_enabled = agentCorePayload.is_enabled;
      if (agentCorePayload.activation_mode !== undefined) agentToUpdateData.activation_mode = agentCorePayload.activation_mode;
      
      const agentTypeFromPayload = agentCorePayload.agent_type;

      if (agentTypeFromPayload) {
        agentToUpdateData.agent_type = agentTypeFromPayload;
        if (agentTypeFromPayload === 'chattalyst') {
          agentToUpdateData.n8n_webhook_url = null;
          if (agentCorePayload.prompt !== undefined) agentToUpdateData.prompt = agentCorePayload.prompt;
        } else if (agentTypeFromPayload === 'n8n') {
          agentToUpdateData.prompt = ''; 
          if (agentCorePayload.n8n_webhook_url !== undefined) agentToUpdateData.n8n_webhook_url = agentCorePayload.n8n_webhook_url;
          else agentToUpdateData.n8n_webhook_url = null; 
        }
      } else { 
        // If agent_type is not in payload, only update prompt/webhook if they are explicitly provided
        if (agentCorePayload.prompt !== undefined) agentToUpdateData.prompt = agentCorePayload.prompt;
        if (agentCorePayload.n8n_webhook_url !== undefined) agentToUpdateData.n8n_webhook_url = agentCorePayload.n8n_webhook_url;
      }

      let updatedAgent: AIAgentDbRow | null = null;
      if (Object.keys(agentToUpdateData).length > 0) {
        const { data, error } = await supabase.from('ai_agents').update(agentToUpdateData)  // Removed 'as any'
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
      if (integrationIdsToUpdate !== undefined) { // This means the key was present in the payload
        await supabase.from('ai_agent_integrations').delete().eq('agent_id', agentIdFromPath);
        // Check if integrationIdsToUpdate is not null AND has items before trying to map/insert
        if (integrationIdsToUpdate && integrationIdsToUpdate.length > 0) {
          const links = integrationIdsToUpdate.map(id => ({ agent_id: agentIdFromPath, integration_id: id }));
          await supabase.from('ai_agent_integrations').insert(links);
        }
      }
      
      const { data: finalIntegrations } = await supabase.from('ai_agent_integrations').select('integration_id').eq('agent_id', agentIdFromPath);
      const { data: finalKnowledge } = await supabase.from('ai_agent_knowledge_documents').select('document_id').eq('agent_id', agentIdFromPath);

      const responseAgent: AgentWithDetails = {
        ...updatedAgent, 
        integration_ids: finalIntegrations?.map(l => l.integration_id) || [],
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
