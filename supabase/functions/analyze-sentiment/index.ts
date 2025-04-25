/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "std/http/server.ts"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts"; // Use Service Role for DB access
import { openai } from "../_shared/openaiUtils.ts"; // Use shared OpenAI client
import { parseRequest, fetchAndFormatConversation, analyzeSentimentWithOpenAI } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }

    // 2. Parse Request
    const { conversationId } = await parseRequest(req);

    // 3. Create Supabase Service Role Client
    const supabaseClient = createSupabaseServiceRoleClient();

    // 4. Fetch and Format Conversation Transcript
    const transcript = await fetchAndFormatConversation(supabaseClient, conversationId);

    // 5. Analyze Sentiment with OpenAI
    // analyzeSentimentWithOpenAI handles the case where transcript is empty
    const analysisResult = await analyzeSentimentWithOpenAI(openai, transcript);

    // 6. Format and Return Response
    const responsePayload = {
      conversation_id: conversationId,
      sentiment: analysisResult.sentiment,
      description: analysisResult.description,
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in analyze-sentiment handler:', error.message);
    let status = 500;
    // Set specific statuses based on error messages from utils
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message === "Missing required field: conversationId") status = 400;
    if (error.message.startsWith("Database error")) status = 500; // Or potentially 404 if specific
    if (error.message.startsWith("OpenAI API error")) status = 502; // Bad Gateway
    if (error.message === "OpenAI client is not initialized (API key likely missing).") status = 503; // Service Unavailable
    if (error.message === "Failed to parse JSON response from OpenAI.") status = 502;
    if (error.message === "OpenAI returned invalid JSON format for sentiment analysis.") status = 502;


    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
