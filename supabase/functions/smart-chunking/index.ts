/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'std/http/server.ts'; // Use import map alias
import { corsHeaders } from '../_shared/cors.ts';
import { openai } from '../_shared/openaiUtils.ts'; // Use shared OpenAI client
import { parseRequest, createSmartChunks, fallbackChunking } from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { content, maxChunks } = await parseRequest(req);

    // 2. Determine Chunking Strategy (Smart vs. Fallback)
    let chunks: string[];
    if (openai) {
      // Use OpenAI if client is available
      chunks = await createSmartChunks(openai, content, maxChunks);
    } else {
      // Fallback if OpenAI client is not initialized (key missing)
      console.log('No OpenAI API key found, using fallback chunking');
      chunks = fallbackChunking(content, maxChunks);
    }

    // 3. Return Chunks
    return new Response(
      JSON.stringify({ chunks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in smart-chunking handler:', error.message);
    let status = 500;
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message.includes("'content' field")) status = 400; // Missing content error

    // Note: Errors from createSmartChunks (API/parsing) are handled internally by falling back
    // to fallbackChunking, so they shouldn't typically reach this catch block unless
    // the fallback itself fails or an unexpected error occurs.

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
