import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
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

    // Fetch documents for the authenticated user
    // Fetch documents for the authenticated user using the correct table name
    const { data: documents, error: fetchError } = await supabase
      .from('knowledge_documents') // Use correct table name
      .select('id, title') // Select 'title' instead of 'name'
      .eq('user_id', user.id); // Filter by user ID (RLS should also enforce this)

    if (fetchError) {
      console.error('Error fetching knowledge documents:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch knowledge documents', details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map title to name for consistency with the frontend component expectation (or update component later)
    const mappedDocuments = (documents || []).map(doc => ({ id: doc.id, name: doc.title }));

    return new Response(JSON.stringify({ documents: mappedDocuments as { id: string; name: string }[] }), {
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
