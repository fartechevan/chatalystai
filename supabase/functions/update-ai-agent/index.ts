import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Use full URL with correct version
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

// Define the expected input structure for updating an agent
// Matches the UpdateAIAgent type from src/types/aiAgents.ts but defined here
interface UpdateAgentPayload {
  name?: string;
  prompt?: string;
  knowledge_document_ids?: string[];
}

type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a PUT or PATCH request
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Extract agent ID from the URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agentId = pathParts[pathParts.length - 1]; // Assuming ID is the last part

    if (!agentId) {
       return new Response(JSON.stringify({ error: 'Missing agent ID in URL path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with auth context
    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'User authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the request body
    const payload: UpdateAgentPayload = await req.json();

    // Basic validation: Ensure at least one field is being updated
    if (Object.keys(payload).length === 0) {
       return new Response(JSON.stringify({ error: 'No update fields provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for update (only include fields present in the payload)
    const agentToUpdate: Partial<AIAgent> = {};
    if (payload.name !== undefined) agentToUpdate.name = payload.name;
    if (payload.prompt !== undefined) agentToUpdate.prompt = payload.prompt;
    if (payload.knowledge_document_ids !== undefined) {
      agentToUpdate.knowledge_document_ids = payload.knowledge_document_ids;
    }
    // updated_at is handled by the trigger

    // Update the agent in the database
    const { data: updatedAgent, error: updateError } = await supabase
      .from('ai_agents')
      .update(agentToUpdate)
      .eq('id', agentId)
      .eq('user_id', user.id) // RLS also enforces this
      .select()
      .single();

    if (updateError) {
      console.error('Error updating AI agent:', updateError);
      // Check if the error is due to the agent not being found (or not belonging to the user)
      if (updateError.code === 'PGRST116') { // PostgREST code for "Matching row not found"
         return new Response(JSON.stringify({ error: 'AI Agent not found or access denied' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update AI agent', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!updatedAgent) {
       return new Response(JSON.stringify({ error: 'AI Agent not found after update attempt' }), {
          status: 404, // Should have been caught by updateError PGRST116, but as a fallback
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ agent: updatedAgent as AIAgent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // 200 OK status
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof SyntaxError ? 'Invalid JSON payload' : 'Internal server error';
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    return new Response(JSON.stringify({ error: errorMessage, details: error.message }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
