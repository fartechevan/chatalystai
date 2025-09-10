// Follow https://supabase.com/docs/guides/functions/quickstart#create-a-function

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { openai, generateEmbedding } from "../_shared/openaiUtils.ts"; // Reverted to original import
// Import the ChatCompletionMessageParam type
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MATCH_THRESHOLD = 0.30; // Lowered similarity threshold
const MATCH_COUNT = 10;      // Max number of chunks to retrieve (Increased from 5)

// Updated interface to match the new function return structure
interface MatchedChunk {
  id: string;
  content: string;
  metadata: any; // JSONB type
  embedding: any; // JSONB type
  similarity: number;
  document_id: string;
}

console.log("Function 'query-agent' v1.1 up and running!");

serve(async (req: Request) => {
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
    // Reverted check for imported openai object
    if (!openai) {
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }

    // 2. Create Supabase client
    const supabaseClient = createSupabaseServiceRoleClient();

    // 3. Fetch Agent Details (simplified since we now pass agent_id directly to the function)
    console.log(`Fetching details for agent ${agentId}...`);
    const { data: agentData, error: agentError } = await supabaseClient
      .from('ai_agents')
      .select('prompt')
      .eq('id', agentId)
      .single();

    if (agentError || !agentData) {
      console.error("Error fetching agent details:", agentError);
      throw new Error(`Agent with ID ${agentId} not found or error fetching details.`);
    }

    // Extract prompt
    const systemPrompt = agentData.prompt;
    console.log(`Agent prompt length: ${systemPrompt?.length || 0}`);

    // 4. Generate query embedding
    console.log("Generating embedding for query...");
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      throw new Error("Failed to generate embedding for the query.");
    }
    console.log("Embedding generated.");

    // 5. Find relevant knowledge chunks using the new function
    let contextText = ""; // Initialize contextText
    let contextFound = false; // Flag to track if context was successfully found

    console.log(`Attempting to match chunks for agent ID: ${agentId}`);
    
    // Call the new RPC function with agent_id directly
    const { data: chunks, error: matchError } = await supabaseClient.rpc('match_knowledge_chunks_for_agent', {
      p_agent_id: agentId,
      p_filter: null, // Add the missing p_filter parameter
      p_match_count: MATCH_COUNT,
      p_match_threshold: MATCH_THRESHOLD,
      p_query_embedding: queryEmbedding
    });

    if (matchError) {
      console.error("Error matching chunks:", matchError);
      // Context retrieval failed - Keep flag as false
      contextText = "Error: Could not retrieve relevant context."; // Internal message for logging
    } else if (chunks && chunks.length > 0) {
      contextFound = true; // Set flag to true only when chunks are found
      const returnedDocIds = chunks.map((c: MatchedChunk) => c.document_id);
      console.log(`Found ${chunks.length} relevant chunks. Document IDs returned: [${[...new Set(returnedDocIds)].join(', ')}]`);
      
      // Apply the MatchedChunk type here
      contextText = chunks
        .map((chunk: MatchedChunk) => `Context from document ${chunk.document_id}:\n${chunk.content}`)
        .join("\n\n---\n\n");
    } else {
      console.log("No chunks found for the agent.");
      contextText = "Info: No context found for this query.";
    }

    // Log the internal state before deciding the response
    console.log("Internal Context State:", contextText); // Log the internal message
    console.log("Context Found Flag:", contextFound);

    if (!contextFound) {
      console.log("Context not found or error retrieving. Returning a standardized message.");
      const noContextResponse = "I'm sorry, but I don't have information about that. For details, I recommend reaching out to customer support or visiting the official website for more information.";
      return new Response(
        JSON.stringify({ response: noContextResponse }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 6. Construct the final prompt (Only if context was found)
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
      temperature: 0.2, // Lowered temperature for more deterministic response
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
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("Error in query-agent function:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
