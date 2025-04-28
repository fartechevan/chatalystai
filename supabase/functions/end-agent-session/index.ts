// supabase/functions/end-agent-session/index.ts
import { serve } from "std/http/server.ts"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";

console.log("end-agent-session function booting up");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  let supabaseClient;
  try {
    // Parse request body
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: session_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Attempting to end session: ${session_id}`);

    // Create Supabase service role client
    supabaseClient = createSupabaseServiceRoleClient();

    // Update the session status to 'closed'
    const { data, error } = await supabaseClient
      .from('ai_agent_sessions')
      .update({ status: 'closed' }) // Set status to closed
      .eq('id', session_id)
      .select('id') // Select ID to confirm update happened
      .single(); // Expect one row to be updated

    if (error) {
      console.error(`Error updating session ${session_id} to closed:`, error);
      // Check for specific errors, e.g., session not found (PGRST116 might indicate this if RLS is strict or ID doesn't exist)
      if (error.code === 'PGRST116') { // Resource Not Found
         return new Response(
           JSON.stringify({ error: `Session with ID ${session_id} not found.` }),
           { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
         );
      }
      throw error; // Re-throw other errors
    }

    if (!data) {
       // This case might happen if the session_id didn't exist and the query didn't error (less likely with .single())
       console.warn(`No session found with ID ${session_id} to update.`);
        return new Response(
           JSON.stringify({ error: `Session with ID ${session_id} not found.` }),
           { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
         );
    }

    console.log(`Successfully closed session: ${session_id}`);
    return new Response(
      JSON.stringify({ success: true, message: `Session ${session_id} closed successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Error in end-agent-session function:", error);
    // Handle JSON parsing errors or other unexpected errors
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    let status = 500;
    if (error instanceof SyntaxError) { // JSON parsing error
        status = 400;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});
