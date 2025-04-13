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

    if (!relevantSchemaParts || relevantSchemaParts.length === 0) {
      return new Response(
        JSON.stringify({ response: "I couldn't find any relevant data schema to answer your query." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Construct SQL query using OpenAI
    const schemaString = relevantSchemaParts.map(p => `${p.table_name}(${p.column_name}) - ${p.description}`).join('\n');
    const sqlGenerationPrompt = `
      Given the user query: "${query}"
      And the following potentially relevant database schema parts (table(column) - description):
      ${schemaString}

      Generate a safe, read-only PostgreSQL query to answer the user's question based *only* on the provided schema parts.
      - Only use the tables and columns listed above.
      - Do not use functions or procedures unless explicitly mentioned in the schema descriptions.
      - If the query cannot be answered with the given schema, respond with "QUERY_NOT_POSSIBLE".
      - Respond ONLY with the raw SQL query, without any explanation, comments, or markdown formatting.
    `;

    console.log("Sending prompt to OpenAI for SQL generation...");
    const sqlCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or a more capable model if needed
      messages: [{ role: "user", content: sqlGenerationPrompt }],
      temperature: 0.2, // Lower temperature for more deterministic SQL
      max_tokens: 200,
      stop: ["--", ";"], // Stop generation at comments or end of statement
    });

    let generatedSql = sqlCompletion.choices[0]?.message?.content?.trim() || "";
    console.log("Generated SQL attempt:", generatedSql);

    if (!generatedSql || generatedSql === "QUERY_NOT_POSSIBLE" || !generatedSql.toUpperCase().startsWith("SELECT")) {
       // Basic safety check or if LLM indicated impossibility
       console.warn("SQL generation failed or deemed unsafe/impossible.");
       return new Response(
         JSON.stringify({ response: "Sorry, I couldn't construct a valid query to answer that based on the available data." }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
    }
    
    // REMOVED: Semicolon addition logic, as it causes syntax errors within the execute_dynamic_sql function.
    // The execute_dynamic_sql function handles the query structure.

    // 4. Execute the generated SQL query via RPC
    console.log("Executing generated SQL via RPC (without trailing semicolon):", generatedSql);
    // Use the RPC call to the execute_dynamic_sql function
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
        'execute_dynamic_sql', 
        { sql_query: generatedSql }
    );

    if (rpcError) {
      console.error("Error executing generated SQL via RPC:", rpcError);
      // Provide a more user-friendly error, but log the details
      throw new Error(`Failed to execute the data query via RPC. Details: ${rpcError.message}`);
    }

    // 5. Format the results (Simple formatting for now, could use another LLM call)
    // The result from execute_dynamic_sql is expected to be JSON (likely an array)
    const queryResult = rpcData; // The data returned by the RPC call *is* the result
    console.log("SQL Query Result (from RPC):", queryResult);

    let finalResponse = "Sorry, I couldn't process the results."; // Default response

    // Check if queryResult is an array (as expected from json_agg)
    if (queryResult && Array.isArray(queryResult)) {
      if (queryResult.length > 0) {
        // Convert the JSON result to a natural language response using OpenAI
        const resultString = JSON.stringify(queryResult, null, 2);
        const summarizationPrompt = `
          The user asked: "${query}"
          The database query returned the following result:
          \`\`\`json
          ${resultString}
          \`\`\`
          Explain this result to the user in a concise, non-technical sentence or two, directly answering their original question. Avoid mentioning JSON or SQL.
        `;

        console.log("Sending result to OpenAI for summarization...");
        try {
          const summaryCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Or a more capable model
            messages: [{ role: "user", content: summarizationPrompt }],
            temperature: 0.5,
            max_tokens: 150,
          });
          finalResponse = summaryCompletion.choices[0]?.message?.content?.trim() || "I found the data, but couldn't summarize it.";
          console.log("OpenAI Summarized Response:", finalResponse);
        } catch (summaryError) {
           console.error("Error calling OpenAI for summarization:", summaryError);
           // Fallback to showing the raw data if summarization fails
           finalResponse = `I found the following data, but had trouble summarizing it:\n\`\`\`json\n${resultString}\n\`\`\``;
        }

      } else {
        // Handle empty array result
        finalResponse = "I ran the query, but it returned no results matching your request.";
      }
    } else {
      // Handle cases where the result might not be an array or is null/undefined
      console.warn("Query result format was not an array or was empty/null:", queryResult);
      finalResponse = "I executed the query, but the result format was unexpected or empty.";
    }

    return new Response(
      JSON.stringify({ response: finalResponse }), // Send the summarized (or fallback) response
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
