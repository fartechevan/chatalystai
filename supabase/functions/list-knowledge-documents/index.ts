import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

// Use the correct table name and 'title' field from the regenerated types
type KnowledgeDocument = Pick<Database['public']['Tables']['knowledge_documents']['Row'], 'id' | 'title'>;

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a GET request
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Use the service role client to bypass RLS for this internal operation
    const supabase = createSupabaseServiceRoleClient();
    
    // We still need to get the user to scope the document listing when no agent_id is provided
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('User auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'User authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch documents for the authenticated user
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent_id');

    let query = supabase.from('knowledge_documents').select('id, title');

    if (agentId) {
      // If agent_id is provided, fetch the agent to get its linked document IDs
      const { data: agent, error: agentError } = await supabase
        .from('ai_agents')
        .select('knowledge_document_ids')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error(`Error fetching agent ${agentId}:`, agentError);
        throw new Error(`Failed to fetch agent details: ${agentError.message}`);
      }

      const documentIds = agent?.knowledge_document_ids || [];
      
      if (documentIds.length === 0) {
        // If no documents are linked, return an empty array immediately
        return new Response(JSON.stringify({ documents: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      query = query.in('id', documentIds);
    } else {
      // Otherwise, fetch all documents for the user
      query = query.eq('user_id', user.id);
    }

    const { data: documents, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching knowledge documents:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch knowledge documents', details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map title to name for consistency with the frontend component expectation (or update component later)
    const mappedDocuments = (documents || []).map((doc: { id: string; title: string }) => ({ id: doc.id, name: doc.title }));

    return new Response(JSON.stringify({ documents: mappedDocuments as { id: string; name: string }[] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error('Unexpected error:', message);
    return new Response(JSON.stringify({ error: 'Internal server error', details: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
