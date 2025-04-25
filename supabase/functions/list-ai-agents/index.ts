import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Use the cors module from import_map.json if available, otherwise keep manual headers
// import cors from 'cors'; // Check if this resolves via import map
import { corsHeaders } from '../_shared/cors.ts'; // Keep manual headers for now
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

// Helper function to handle responses with CORS
function createJsonResponse(body: unknown, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a GET request
  if (req.method !== 'GET') {
     return createJsonResponse({ error: 'Method Not Allowed' }, 405);
  }


  try {
    // Create Supabase client with auth context using the Request object
    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) { // Combine checks
      console.error('User auth error:', userError?.message || 'User not found');
       return createJsonResponse({ error: 'User authentication failed' }, 401);
    }

    // Fetch agents for the authenticated user
    const { data: agents, error: fetchError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching AI agents:', fetchError.message);
       return createJsonResponse({ error: 'Failed to fetch AI agents', details: fetchError.message }, 500);
    }

     return createJsonResponse({ agents: agents as AIAgent[] }, 200);

  } catch (error) {
    console.error('Unexpected error in list-ai-agents:', error.message);
     return createJsonResponse({ error: 'Internal server error', details: error.message }, 500);
  }
});
