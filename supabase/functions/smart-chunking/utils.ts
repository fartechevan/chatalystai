/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import OpenAI from "openai"; // Use mapped import

interface RequestBody {
  content: string;
  maxChunks?: number;
}

/**
 * Parses and validates the incoming request for smart chunking.
 * Checks for POST method and required 'content' field.
 *
 * @param req The incoming request object.
 * @returns The validated content and maxChunks.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<{ content: string; maxChunks: number }> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed");
  }

  let body: Partial<RequestBody>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }

  const { content, maxChunks = 10 } = body; // Default maxChunks to 10

  if (!content || typeof content !== 'string') {
    throw new Error("Missing or invalid 'content' field in request body.");
  }

  return { content, maxChunks };
}

/**
 * Creates semantically meaningful chunks from text using OpenAI.
 * Includes fallback to simple chunking on API errors or parsing failures.
 *
 * @param openaiClient Initialized OpenAI client.
 * @param content The text content to chunk.
 * @param maxChunks The target maximum number of chunks.
 * @returns An array of text chunks.
 */
export async function createSmartChunks(
    openaiClient: OpenAI,
    content: string,
    maxChunks: number
): Promise<string[]> {
  try {
    // Prepare a simpler version of the text if it's too long for the prompt context
    let textToProcess = content;
    // Rough estimate: Keep context manageable for GPT-3.5 Turbo (adjust limit as needed)
    const contextLimit = 10000;
    if (content.length > contextLimit) {
      const sampleLength = Math.floor(contextLimit / 2) - 100; // Leave room for prompt/truncation markers
      textToProcess = content.substring(0, sampleLength) +
                     '\n...[content truncated]...\n' +
                     content.substring(content.length - sampleLength);
      console.warn(`Content truncated for OpenAI chunking prompt due to length > ${contextLimit}`);
    }

    const systemPrompt = `You are an AI assistant that helps with document chunking for semantic search. Your task is to split the provided text into logical, semantically meaningful chunks. Each chunk should ideally represent a complete thought, topic, or section. Aim for roughly ${maxChunks} chunks, but prioritize semantic coherence over exact count. Return ONLY a JSON array of strings (the text chunks) without any additional text, comments, or markdown formatting. Ensure the chunks cover the entire text without omitting content.`;
    const userPrompt = `TEXT TO CHUNK:\n${textToProcess}`;

    console.log(`Requesting smart chunking from OpenAI (target: ${maxChunks} chunks)...`);
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo', // Or potentially a model better suited for long context/structuring
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, // Lower temperature for more deterministic chunking
      // max_tokens: ? // Consider setting max_tokens if needed, depends on expected chunk size
      response_format: { type: "json_object" }, // Request JSON output if model supports it reliably
    });

    const assistantMessage = completion.choices[0]?.message?.content;
    if (!assistantMessage) {
        throw new Error("OpenAI response content is empty.");
    }

    // Attempt to parse the JSON array from the response
    try {
      // More robust parsing: find JSON array within potential markdown/text
      const jsonMatch = assistantMessage.match(/(\[[\s\S]*\])/);
      const jsonString = jsonMatch ? jsonMatch[1] : assistantMessage; // Extract the matched array string
      const parsed = JSON.parse(jsonString);

      // Check if the root element is the array of chunks
      let chunks: unknown;
      if (Array.isArray(parsed)) {
          chunks = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
          // Look for a key that might contain the array (e.g., "chunks")
          // Use a more specific type assertion
          const key = Object.keys(parsed).find(k => Array.isArray((parsed as { [key: string]: unknown })[k]));
          if (key) {
              chunks = (parsed as { [key: string]: unknown })[key];
          }
      }

      if (!Array.isArray(chunks) || !chunks.every(item => typeof item === 'string')) {
        console.error('Parsed OpenAI response is not an array of strings:', chunks);
        throw new Error('Parsed response is not an array of strings');
      }
      console.log(`Successfully generated ${chunks.length} smart chunks.`);
      return chunks;

    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response for chunks:', parseError);
      console.log('Raw response content:', assistantMessage);
      // Fall back to simple chunking if parsing fails
      console.warn("Falling back to simple paragraph chunking due to parsing error.");
      return fallbackChunking(content, maxChunks);
    }
  } catch (error) {
    console.error('Error in createSmartChunks:', error);
    // Fall back to simple chunking on any API or processing error
    console.warn("Falling back to simple paragraph chunking due to error.");
    return fallbackChunking(content, maxChunks);
  }
}

/**
 * Simple fallback chunking mechanism based on paragraphs.
 * Tries to combine paragraphs to approximate the desired number of chunks.
 *
 * @param content The text content.
 * @param maxChunks The target maximum number of chunks.
 * @returns An array of text chunks.
 */
export function fallbackChunking(content: string, maxChunks: number): string[] {
  console.log("Executing fallback paragraph chunking...");
  // Split by one or more newlines, potentially surrounded by whitespace
  const paragraphs = content.split(/\s*\n\s*/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];

  if (paragraphs.length === 0) return [];

  // If we have fewer paragraphs than maxChunks, each paragraph is a chunk
  if (paragraphs.length <= maxChunks) {
    console.log(`Fallback: Returning ${paragraphs.length} paragraph chunks.`);
    return paragraphs;
  }

  // Otherwise, group paragraphs
  const paragraphsPerChunk = Math.ceil(paragraphs.length / maxChunks);
  console.log(`Fallback: Aiming for ${paragraphsPerChunk} paragraphs per chunk.`);

  for (let i = 0; i < paragraphs.length; i += paragraphsPerChunk) {
    // Join paragraphs with double newline for separation
    const chunk = paragraphs.slice(i, i + paragraphsPerChunk).join('\n\n');
    chunks.push(chunk);
  }

  console.log(`Fallback: Generated ${chunks.length} chunks.`);
  return chunks;
}
