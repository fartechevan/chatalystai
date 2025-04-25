import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Use full URL with correct version
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a DELETE request
  if (req.method !== 'DELETE') {
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

    // Delete the agent from the database
    const { error: deleteError } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', agentId)
      .eq('user_id', user.id); // RLS also enforces this

    if (deleteError) {
      console.error('Error deleting AI agent:', deleteError);
       // Check if the error is due to the agent not being found (or not belonging to the user)
      if (deleteError.code === 'PGRST116') { // PostgREST code for "Matching row not found"
         return new Response(JSON.stringify({ error: 'AI Agent not found or access denied' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to delete AI agent', details: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If deletion was successful (or row didn't exist which is fine for DELETE)
    return new Response(null, { // Return 204 No Content on successful deletion
      headers: { ...corsHeaders },
      status: 204,
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
