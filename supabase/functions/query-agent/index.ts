// Follow https://supabase.com/docs/guides/functions/quickstart#create-a-function
// Use imports based on import_map.json
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Use alias from import_map.json
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts";
import { openai, generateEmbedding } from "../_shared/openaiUtils.ts"; // Reverted to original import
const MATCH_THRESHOLD = 0.70; // Lowered similarity threshold
const MATCH_COUNT = 10; // Max number of chunks to retrieve (Increased from 5)
console.log("Function 'query-agent' v1.1 up and running!");
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response("ok", {
      headers: corsHeaders
    });
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
    const { data: agentData, error: agentError } = await supabaseClient.from('ai_agents').select('prompt').eq('id', agentId).single();
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
    let imageUrls = [];       // store all images found
    let selectedImageUrl = null;     // store the most relevant image
    console.log(`Attempting to match chunks for agent ID: ${agentId}`);
    // Call the new RPC function with agent_id directly
    const { data: chunks, error: matchError } = await supabaseClient.rpc('match_vector_db_v1_for_agent', {
      query_embedding: queryEmbedding,
      p_agent_id: agentId,
      match_count: MATCH_COUNT,
      filter: {} // JSONB - Empty filter object
    });
    if (matchError) {
      console.error("Error matching chunks:", matchError);
      // Context retrieval failed - Keep flag as false
      contextText = "Error: Could not retrieve relevant context."; // Internal message for logging
    } else if (chunks && chunks.length > 0) {
      // Filter chunks by similarity threshold (since the new function doesn't have this built-in)
      const filteredChunks = chunks.filter((chunk)=>chunk.similarity >= MATCH_THRESHOLD);
      // ===== Insert collection of image URLs =====
      const imageChunks = filteredChunks.filter((c)=>c.chunk_type === 'image' && c.image_url);
      imageUrls = imageChunks.map((c)=>c.image_url);        // storing the most relevant image

      // Pick the single most relevant image
      if (imageChunks.length > 0) {
        const best = imageChunks.reduce((bestSoFar, chunk) => {
          try {
            const infoArray = chunk.metadata?.image_info;
            if (Array.isArray(infoArray) && infoArray.length > 0) {
              const scoreRaw = infoArray[0].relevance_score;
              const score = typeof scoreRaw === 'number'
                ? scoreRaw
                : parseInt(scoreRaw, 10) || 0;
              if (!bestSoFar || score > bestSoFar.score) {
                return { chunk, score };
              }
            }
          } catch (e) {
            // ignore malformed metadata
          }
          return bestSoFar;
        }, null);

        if (best && best.chunk) {
          selectedImageUrl = best.chunk.image_url;
        }
      }

      // ============================================
      if (filteredChunks.length > 0) {
        contextFound = true;
        console.log(`Found ${filteredChunks.length} relevant chunks above threshold (${MATCH_THRESHOLD}).`);

        // Build contextText: pick top text chunks, then the single image if any
        const textChunks = filteredChunks.filter(c => c.chunk_type === 'text');
        // For example, top 3 text chunks (already in similarity order from RPC):
        const topTextChunks = textChunks.slice(0, 3);
        const textParts = topTextChunks.map(chunk =>
          `Context from document ${chunk.document_id} (text chunk):\n${chunk.content}`
        );

        if (selectedImageUrl) {
          const imgChunk = imageChunks.find(c => c.image_url === selectedImageUrl);
          if (imgChunk) {
            textParts.push(
              `Context from document ${imgChunk.document_id} (image chunk):\n${imgChunk.content}\nImage URL: ${selectedImageUrl}`
            );
          }
        }
        contextText = textParts.join("\n\n---\n\n");
      } else {
        console.log(`Found ${chunks.length} chunks but none above similarity threshold ${MATCH_THRESHOLD}.`);
        contextText = "Info: No sufficiently relevant context found for this query.";
      }
    } else {
      console.log("No chunks found for the agent.");
      contextText = "Info: No context found for this query.";
    }
    // Log the internal state before deciding the response
    console.log("Internal Context State:", contextText); // Log the internal message
    console.log("Context Found Flag:", contextFound);
    // --- START: Custom Response for No Context ---
    // Check the flag instead of the text content
    if (!contextFound) {
      console.log("Context not found or error retrieving. Returning custom response.");
      const customResponse = "I'll get back to you on this. Are there any other questions you would like to know?";
      return new Response(JSON.stringify({
        response: customResponse
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // --- END: Custom Response for No Context ---
    // 6. Construct the final prompt (Only if context was found)
    // Use the directly imported type
    const messages = [
      {
        role: 'system',
        content: systemPrompt || "You are a helpful assistant."
      },
      {
        role: 'user',
        content: `Based on the following context, please answer the query:

Context:
---
${contextText}
---

Query: ${query}`
      }
    ];
    console.log("Constructed prompt messages:", JSON.stringify(messages, null, 2));
    // 7. Call OpenAI API
    console.log("Calling OpenAI Chat Completions API...");
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.2,
      max_tokens: 500
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
    return new Response(JSON.stringify({
      response: aiResponse,
      image_urls: imageUrls,
      selected_image: selectedImageUrl
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error in query-agent function:", error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
