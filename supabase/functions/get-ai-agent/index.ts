import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Use full URL with correct version
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

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

    // Fetch the specific agent for the authenticated user
    const { data: agent, error: fetchError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id) // RLS also enforces this
      .single(); // Expecting a single row or null

    if (fetchError) {
      console.error('Error fetching AI agent:', fetchError);
       // Check if the error is due to the agent not being found (or not belonging to the user)
      if (fetchError.code === 'PGRST116') { // PostgREST code for "Matching row not found"
         return new Response(JSON.stringify({ error: 'AI Agent not found or access denied' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to fetch AI agent', details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

     if (!agent) {
       // This case should ideally be covered by PGRST116, but handle explicitly if needed
       return new Response(JSON.stringify({ error: 'AI Agent not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ agent: agent as AIAgent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
