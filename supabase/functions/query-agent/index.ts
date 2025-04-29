// Follow https://supabase.com/docs/guides/functions/quickstart#create-a-function

// Use imports based on import_map.json
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"; // Using full URL instead of alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { openai, generateEmbedding } from "../_shared/openaiUtils.ts";
// Import type using the alias defined in import_map.json
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MATCH_THRESHOLD = 0.70; // Lowered similarity threshold
const MATCH_COUNT = 10;      // Max number of chunks to retrieve (Increased from 5)

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

    // 3. Fetch Agent Details and associated Knowledge Document IDs
    console.log(`Fetching details and linked documents for agent ${agentId}...`);
    const { data: agentData, error: agentError } = await supabaseClient
      .from('ai_agents')
      .select(`
        prompt,
        ai_agent_knowledge_documents!agent_id(document_id)
      `)
      .eq('id', agentId)
      .single();

    if (agentError || !agentData) {
      console.error("Error fetching agent details:", agentError);
      throw new Error(`Agent with ID ${agentId} not found or error fetching details.`);
    }

    // Extract prompt and document IDs
    const systemPrompt = agentData.prompt;
    // Supabase returns related data as an array of objects, map to get just the IDs
    const documentIds = agentData.ai_agent_knowledge_documents.map((link: { document_id: string }) => link.document_id);

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
      // --- Added Detailed Logging ---
      console.log(`Attempting to match chunks for specific document IDs: [${documentIds.join(', ')}]`);
      // --- End Added Logging ---
      // Call RPC function with the document_ids filter
      const { data: chunks, error: matchError } = await supabaseClient.rpc('match_chunks', {
        match_count: MATCH_COUNT,           // int
        match_threshold: MATCH_THRESHOLD,   // float
        query_embedding: queryEmbedding,    // vector(1536)
        filter_document_ids: documentIds    // uuid[] - Pass the fetched document IDs
      });

      if (matchError) {
        console.error("Error matching chunks:", matchError);
        // Don't throw, just proceed without context if matching fails
        contextText = "Could not retrieve relevant context due to an error.";
      } else if (chunks && chunks.length > 0) {
        // --- Added Detailed Logging ---
        const returnedDocIds = chunks.map((c: MatchedChunk) => c.document_id);
        console.log(`Found ${chunks.length} relevant chunks. Document IDs returned: [${[...new Set(returnedDocIds)].join(', ')}]`); // Log unique doc IDs
        // --- End Added Logging ---
        // Apply the MatchedChunk type here
        contextText = chunks
          .map((chunk: MatchedChunk) => `Context from document ${chunk.document_id}:\n${chunk.content}`) // Keep original mapping
          .join("\n\n---\n\n");
      } else {
        console.log("No relevant chunks found for the specified document IDs.");
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
