/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import OpenAI from "https://esm.sh/openai@4.52.7";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// Function to generate embedding (reuse from vectorize-schema or keep separate)
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002", 
      input: text.replaceAll("\n", " "), 
    });
    // Ensure the embedding exists before returning
     if (embeddingResponse?.data?.[0]?.embedding) {
       return embeddingResponse.data[0].embedding;
     }
     console.error("Invalid embedding response structure:", embeddingResponse);
     return null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null; 
  }
}

// Function to find relevant schema parts based on query embedding using RPC
async function findRelevantSchema(supabaseClient: SupabaseClient, queryEmbedding: number[], matchThreshold: number = 0.7, matchCount: number = 5) {
  if (!queryEmbedding) {
    console.error("findRelevantSchema called without queryEmbedding.");
    throw new Error("Query embedding is required.");
  }

  console.log(`Calling match_schema_embeddings with threshold: ${matchThreshold}, count: ${matchCount}`);

  const { data, error } = await supabaseClient.rpc('match_schema_embeddings', {
    query_embedding: queryEmbedding, // Pass the embedding array directly
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("Error calling match_schema_embeddings RPC:", error);
    // Log the specific Supabase error
    console.error("Supabase error details:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to query schema embeddings via RPC: ${error.message}`);
  }

  if (!data) {
     console.warn("match_schema_embeddings RPC returned null data, but no error.");
     return [];
  }

  console.log(`Found ${data.length} relevant schema parts via RPC.`);
  return data;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      throw new Error("Missing or invalid 'query' parameter in request body.");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    ) as SupabaseClient;

    // 1. Generate embedding for the user query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      throw new Error("Failed to generate embedding for the query.");
    }

    // 2. Find relevant schema parts
    const relevantSchemaParts = await findRelevantSchema(supabaseClient, queryEmbedding);

    // --- TODO: SQL Generation & Execution ---
    // 3. Construct SQL query based on `query` and `relevantSchemaParts`.
    //    This is the most complex part, likely requiring another LLM call 
    //    with specific instructions to generate safe, executable SQL.
    //    Example prompt structure:
    //    "Given the user query '{query}' and the following relevant schema parts: {relevantSchemaParts}, 
    //     generate a safe SQL query for PostgreSQL to answer the user's question. 
    //     Only query the tables/columns provided. Respond ONLY with the SQL query."
    
    // 4. Execute the generated SQL query using supabaseClient.rpc or similar.
    //    Ensure proper error handling and potentially limit results.

    // 5. Format the results (maybe another LLM call for summarization).
    // --- End TODO ---


    // For now, return the relevant schema parts found as a simulated response
    const simulatedResponse = `Based on your query "${query}", I found these potentially relevant schema parts: ${JSON.stringify(relevantSchemaParts, null, 2)}. (SQL generation/execution not implemented yet).`;

    return new Response(
      JSON.stringify({ response: simulatedResponse }), // Simulate a response object
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in query-data-with-ai function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
