import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Revert to full URL with correct version
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

// Define the expected input structure for creating an agent
// Matches the NewAIAgent type from src/types/aiAgents.ts but defined here for the function
interface NewAgentPayload {
  name: string;
  prompt: string;
  knowledge_document_ids?: string[];
}

type AIAgent = Database['public']['Tables']['ai_agents']['Row'];

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create Supabase client with auth context using the Request object
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
    const payload: NewAgentPayload = await req.json();

    // Basic validation
    if (!payload.name || !payload.prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name and prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for insertion
    const agentToInsert = {
      user_id: user.id,
      name: payload.name,
      prompt: payload.prompt,
      knowledge_document_ids: payload.knowledge_document_ids || null, // Use null if not provided
    };

    // Insert the new agent into the database
    const { data: newAgent, error: insertError } = await supabase
      .from('ai_agents')
      .insert(agentToInsert)
      .select() // Return the newly created row
      .single(); // Expecting a single row back

    if (insertError) {
      console.error('Error inserting AI agent:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create AI agent', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ agent: newAgent as AIAgent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created status
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    // Differentiate between JSON parsing error and other errors
    const errorMessage = error instanceof SyntaxError ? 'Invalid JSON payload' : 'Internal server error';
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    return new Response(JSON.stringify({ error: errorMessage, details: error.message }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
