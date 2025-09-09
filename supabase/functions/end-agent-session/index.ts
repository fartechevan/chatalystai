// supabase/functions/end-agent-session/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";

console.log("end-agent-session function booting up");

serve(async (req: Request) => {
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
    // Log the raw body to see exactly what is being sent
    const rawBody = await req.text();
    console.log(`[end-agent-session] Received raw request body: ${rawBody}`);

    // Parse request body from the raw text
    const body = JSON.parse(rawBody || '{}');
    const { agentId, session_id } = body;

    if (!agentId && !session_id) {
      console.error(`[end-agent-session] Parsed body did not contain agentId or session_id. Body: ${rawBody}`);
      return new Response(
        JSON.stringify({ error: 'Missing required field: agentId or session_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase service role client
    supabaseClient = createSupabaseServiceRoleClient();

    let sessionIdToClose: string | null = null;

    if (agentId) {
        console.log(`[end-agent-session] Received agentId: ${agentId}. Searching for active session.`);
        const { data: activeSession, error: findError } = await supabaseClient
            .from('ai_agent_sessions')
            .select('id')
            .eq('agent_id', agentId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (findError && findError.code !== 'PGRST116') {
            console.error(`[end-agent-session] Database error when searching for active session for agent ${agentId}:`, findError);
            throw findError;
        }
        if (activeSession) {
            sessionIdToClose = activeSession.id;
        } else {
            console.warn(`[end-agent-session] No active session found for agent ${agentId}.`);
        }
    } else if (session_id) {
        console.log(`[end-agent-session] Received session_id: ${session_id}. Using it directly.`);
        sessionIdToClose = session_id;
    }

    if (!sessionIdToClose) {
        console.warn(`[end-agent-session] No session could be identified to close.`);
        return new Response(
            JSON.stringify({ success: true, message: 'No active session found to end.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }

    const sessionId = sessionIdToClose;
    console.log(`[end-agent-session] Found active session ${sessionId}. Attempting to close.`);

    // Update the session status to 'closed'
    const { data: updatedData, error: updateError } = await supabaseClient
      .from('ai_agent_sessions')
      .update({
        status: 'closed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select('id')
      .single();

    if (updateError) {
      console.error(`[end-agent-session] Error updating session ${sessionId} to closed:`, updateError);
      throw updateError;
    }

    console.log(`[end-agent-session] Successfully closed session: ${updatedData.id}`);
    return new Response(
      JSON.stringify({ success: true, message: `Session ${updatedData.id} closed successfully.` }),
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
