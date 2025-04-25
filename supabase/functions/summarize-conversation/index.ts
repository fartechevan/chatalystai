/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'std/http/server.ts'; // Use import map alias
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts'; // Use Service Role for token tracking
import { openai } from '../_shared/openaiUtils.ts'; // Use shared OpenAI client
import { parseRequest, summarizeWithOpenAI, trackTokenUsageDb } from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabaseClient; // Define here for potential use in tracking

  try {
    // 1. Check OpenAI client availability
    if (!openai) {
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }

    // 2. Parse Request
    const { messages } = await parseRequest(req);

    // 3. Summarize Conversation with OpenAI
    const { summary, tokensUsed } = await summarizeWithOpenAI(openai, messages);

    // 4. Track Token Usage (async, non-blocking, best effort)
    if (tokensUsed && tokensUsed > 0) {
      // Create client only if needed for tracking
      supabaseClient = createSupabaseServiceRoleClient();
      // Don't await, let it run in the background. Log errors within the function.
      trackTokenUsageDb(supabaseClient, messages, tokensUsed).catch(err => {
          console.error("Background token tracking failed:", err);
      });
    }

    // 5. Return Summary
    return new Response(
      JSON.stringify({ summary }), // Return summary (which could be null)
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 OK if summarization attempt was made
      },
    );

  } catch (error) {
    console.error('Error in summarize-conversation handler:', error.message);
    let status = 500;
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message === "OpenAI client is not initialized (API key likely missing).") status = 503; // Service Unavailable
    if (error.message.startsWith("OpenAI API error")) status = 502; // Bad Gateway

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});
