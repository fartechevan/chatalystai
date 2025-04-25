/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import OpenAI from "https://esm.sh/openai@4.52.7";

// Initialize OpenAI client globally
// Ensure OPENAI_API_KEY is set in environment variables
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  console.warn("OPENAI_API_KEY environment variable is not set. OpenAI features will be disabled.");
}

export const openai = apiKey ? new OpenAI({ apiKey: apiKey }) : null;

/**
 * Generates a vector embedding for the given text using OpenAI's API.
 *
 * @param text The input text to embed.
 * @param client The initialized OpenAI client instance. Defaults to the global client.
 * @returns A promise that resolves to an array of numbers representing the embedding, or null if an error occurs or the client is not available.
 */
export async function generateEmbedding(
  text: string,
  client: OpenAI | null = openai
): Promise<number[] | null> {
  if (!client) {
    console.error("OpenAI client is not available (API key likely missing). Cannot generate embedding.");
    return null;
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn("generateEmbedding called with empty or invalid text.");
    return null; // Cannot embed empty string
  }

  try {
    // Replace newlines with spaces for better embedding performance
    const processedText = text.replaceAll("\n", " ").trim();
    if (processedText.length === 0) {
       console.warn("generateEmbedding called with text that became empty after processing.");
       return null;
    }

    const embeddingResponse = await client.embeddings.create({
      model: "text-embedding-ada-002", // Standard embedding model
      input: processedText,
    });

    // Validate the response structure carefully
    if (
      embeddingResponse &&
      embeddingResponse.data &&
      Array.isArray(embeddingResponse.data) &&
      embeddingResponse.data.length > 0 &&
      embeddingResponse.data[0].embedding &&
      Array.isArray(embeddingResponse.data[0].embedding)
    ) {
      return embeddingResponse.data[0].embedding;
    } else {
      console.error("Invalid or unexpected embedding response structure:", embeddingResponse);
      return null;
    }
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}
