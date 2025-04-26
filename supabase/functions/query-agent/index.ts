// Follow https://supabase.com/docs/guides/functions/quickstart#create-a-function

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"; // Revert to full URL
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { openai, generateEmbedding } from "../_shared/openaiUtils.ts";
// Revert to specific type import via URL
import type { ChatCompletionMessageParam } from "https://esm.sh/openai@4.52.7/resources/chat/completions";

const MATCH_THRESHOLD = 0.70; // Lowered similarity threshold
const MATCH_COUNT = 5;       // Max number of chunks to retrieve

// Define expected chunk structure from match_chunks RPC
interface MatchedChunk {
  id: string;
  content: string;
  document_id: string;
  similarity: number;
  // Add other fields if returned by your specific RPC function
}

console.log("Function 'query-agent' v1.0 up and running!");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse request body
    const { agentId, query } = await req.json();
    console.log(`Querying agent ${agentId} with query: "${query}"`);

    if (!agentId || !query) {
      throw new Error("Missing 'agentId' or 'query' in request body.");
    }
    if (!openai) {
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }

    // 2. Create Supabase client
    const supabaseClient = createSupabaseServiceRoleClient();

    // 3. Fetch Agent Details
    console.log(`Fetching details for agent ${agentId}...`);
    const { data: agentData, error: agentError } = await supabaseClient
      .from('ai_agents')
      .select('prompt, knowledge_document_ids')
      .eq('id', agentId)
      .single();

    if (agentError || !agentData) {
      console.error("Error fetching agent details:", agentError);
      throw new Error(`Agent with ID ${agentId} not found or error fetching details.`);
    }
    const { prompt: systemPrompt, knowledge_document_ids: documentIds } = agentData;
    console.log(`Agent prompt length: ${systemPrompt?.length || 0}, Document IDs: ${documentIds?.join(', ') || 'None'}`);

    // 4. Generate query embedding
    console.log("Generating embedding for query...");
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      throw new Error("Failed to generate embedding for the query.");
    }
    console.log("Embedding generated.");

    // 5. Find relevant knowledge chunks (only if document IDs are linked)
    let contextText = "";
    if (documentIds && documentIds.length > 0) {
      // console.log("Matching chunks for document IDs:", documentIds); // Temporarily remove logging for filter
      // Call simplified RPC function (without document_ids_filter)
      const { data: chunks, error: matchError } = await supabaseClient.rpc('match_chunks', {
        match_count: MATCH_COUNT,         // int
        match_threshold: MATCH_THRESHOLD, // float
        query_embedding: queryEmbedding   // vector(1536)
        // Removed document_ids_filter
      });

      if (matchError) {
        console.error("Error matching chunks:", matchError);
        // Don't throw, just proceed without context if matching fails
        contextText = "Could not retrieve relevant context due to an error.";
      } else if (chunks && chunks.length > 0) {
        console.log(`Found ${chunks.length} relevant chunks.`);
        // Apply the MatchedChunk type here
        contextText = chunks
          .map((chunk: MatchedChunk) => `Context from document ${chunk.document_id}:\n${chunk.content}`)
          .join("\n\n---\n\n");
      } else {
        console.log("No relevant chunks found.");
        contextText = "No specific context found for this query in the linked documents.";
      }
    } else {
      console.log("Agent has no linked knowledge documents.");
      contextText = "No knowledge documents are linked to this agent.";
    }

    // Log the retrieved context before sending to OpenAI
    console.log("Retrieved Context Text:\n---\n", contextText, "\n---");

    // 6. Construct the final prompt
    // Use the directly imported type
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt || "You are a helpful assistant.", // Use fetched prompt or a default
      },
      {
        role: 'user',
        content: `Based on the following context, please answer the query:

Context:
---
${contextText}
---

Query: ${query}`,
      },
    ];
    console.log("Constructed prompt messages:", JSON.stringify(messages, null, 2));


    // 7. Call OpenAI API
    console.log("Calling OpenAI Chat Completions API...");
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or specify another model like gpt-4
      messages: messages,
      temperature: 0.7, // Adjust creativity vs. factuality
      max_tokens: 500, // Limit response length
    });
    console.log("OpenAI API response received.");

    // 8. Parse the response
    const aiResponse = completionResponse.choices[0]?.message?.content?.trim();
    if (!aiResponse) {
      console.error("OpenAI response missing content:", completionResponse);
      throw new Error("Failed to get a valid response from the AI model.");
    }
    console.log("AI Response:", aiResponse);

    // 9. Return the response
    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in query-agent function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500, // Use 400 for specific client errors later
      }
    );
  }
});
