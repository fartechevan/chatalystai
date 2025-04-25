
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts"; // Use Service Role for RPCs
import { openai } from "../_shared/openaiUtils.ts"; // Use shared OpenAI client
import {
  parseRequest,
  generateQueryEmbedding,
  findRelevantSchema,
  generateSqlQuery,
  executeGeneratedSql,
  summarizeResults,
} from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Check OpenAI client availability
    if (!openai) {
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }

    // 2. Parse Request
    const { query, history } = await parseRequest(req);
    console.log("Received query:", query);
    console.log("Received history length:", history?.length || 0);

    // 3. Create Supabase Service Role Client
    const supabaseClient = createSupabaseServiceRoleClient();

    // 4. Generate Query Embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // 5. Find Relevant Schema Parts
    const relevantSchemaParts = await findRelevantSchema(supabaseClient, queryEmbedding);

    if (!relevantSchemaParts || relevantSchemaParts.length === 0) {
      // Return a specific response if no relevant schema is found
      return new Response(
        JSON.stringify({ response: "I couldn't find any relevant data schema to answer your query." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 6. Generate SQL Query via OpenAI
    const generatedSql = await generateSqlQuery(openai, query, history || [], relevantSchemaParts);

    // 7. Execute Generated SQL via RPC
    const queryResult = await executeGeneratedSql(supabaseClient, generatedSql);

    // 8. Summarize Results via OpenAI
    const finalResponse = await summarizeResults(openai, query, history || [], queryResult);

    // 9. Return Final Response
    return new Response(
      JSON.stringify({ response: finalResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in query-data-with-ai handler:", error.message);
    let status = 500;
    // Set specific statuses based on error messages from utils
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message.includes("parameter in request body")) status = 400; // Missing query
    if (error.message === "OpenAI client is not initialized (API key likely missing).") status = 503; // Service Unavailable
    if (error.message === "Failed to generate embedding for the query.") status = 502; // Bad Gateway (issue with OpenAI)
    if (error.message.startsWith("Failed to query schema embeddings via RPC")) status = 500; // Internal DB/RPC issue
    if (error.message === "SQL generation failed or deemed unsafe/impossible.") {
        // Return a user-friendly message instead of just the error
        return new Response(
            JSON.stringify({ response: "Sorry, I couldn't construct a valid query to answer that based on the available data." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } // Return 200 OK with explanation
        );
    }
    if (error.message.startsWith("OpenAI API error during SQL generation")) status = 502;
    if (error.message.startsWith("Failed to execute the data query via RPC")) status = 500; // Internal DB/RPC issue
    if (error.message.startsWith("OpenAI API error during sentiment analysis")) status = 502; // Error during summarization

    // Default error response
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
