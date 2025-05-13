
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { openai } from "../_shared/openaiUtils.ts";
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

    // 6. Generate SQL Query or Clarification Question via OpenAI
    const sqlOrClarification = await generateSqlQuery(openai, query, history || [], relevantSchemaParts);

    // Check if OpenAI returned a clarification question instead of SQL
    if (!sqlOrClarification.toUpperCase().startsWith("SELECT")) {
      // It's a clarification question (or potentially an unhandled case from generateSqlQuery if it didn't throw)
      console.log("Returning clarification question to user:", sqlOrClarification);
      return new Response(
        JSON.stringify({ response: sqlOrClarification }), // Send the clarification as the main response
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // It's an SQL query, proceed with execution
    const generatedSql = sqlOrClarification;
    console.log("Proceeding with SQL execution:", generatedSql);

    // 7. Execute Generated SQL via RPC
    const queryResult = await executeGeneratedSql(supabaseClient, generatedSql);

    // 8. Summarize Results via OpenAI (potentially including chart data)
    const { summary, chartData } = await summarizeResults(openai, query, history || [], queryResult);

    // 9. Return Final Response (including chart data if available)
    const responsePayload = {
        response: summary,
        ...(chartData && { chartData: chartData }) // Conditionally add chartData
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    // Log the full error object for better debugging
    console.error("Caught error in query-data-with-ai handler:", error); // Keep this top-level log
    let status = 500;
    // Set specific statuses based on error messages from utils
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message.includes("parameter in request body")) status = 400; // Missing query
    if (error.message === "OpenAI client is not initialized (API key likely missing).") status = 503; // Service Unavailable
    if (error.message === "Failed to generate embedding for the query.") status = 502; // Bad Gateway (issue with OpenAI)
    if (error.message.startsWith("Failed to query schema embeddings via RPC")) status = 500; // Internal DB/RPC issue
    
    // Log the exact error message being checked
    console.log(`Checking error.message for SQL generation failure. Message content: "${error.message}"`);

    // Check if the error message indicates an SQL generation failure from OpenAI
    if (error.message && error.message.includes("SQL generation failed or deemed unsafe/impossible.")) { 
        console.log("SQL generation failure condition MET. Returning 200 OK with user-friendly message.");
        // Return a user-friendly message instead of just the error
        // Ensure this error response also follows the { response: string } structure
        return new Response(
            JSON.stringify({ response: "Sorry, I couldn't construct a valid query to answer that based on the available data." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } // Return 200 OK with explanation
        );
    } else {
        console.log("SQL generation failure condition NOT MET. Proceeding with other error checks.");
    }

    if (error.message.startsWith("OpenAI API error during SQL generation")) status = 502;
    if (error.message.startsWith("Failed to execute the data query via RPC")) status = 500; // Internal DB/RPC issue
    // Note: summarizeResults now returns an object, so errors during summarization are handled internally
    // and return { summary: errorMessage, chartData: potentialChartData }

    // Default error response (keep simple error structure for unexpected issues)
    if (error.message.startsWith("Failed to execute the data query via RPC")) status = 500; // Internal DB/RPC issue
    if (error.message.startsWith("OpenAI API error during sentiment analysis")) status = 502; // Error during summarization

    // Default error response
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
