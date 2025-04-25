
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import OpenAI from "https://esm.sh/openai@4.52.7"; // Updated to use fully qualified URL
import { Database } from "../_shared/database.types.ts";

// Define the expected structure of incoming messages
// Adjust based on the actual payload structure from the webhook or client
interface ConversationMessage {
  sender_id?: string; // Assuming sender_id might be the user_id
  content?: string;
  conversation?: {
      conversation_id?: string;
      sender_id?: string; // Potentially redundant, clarify source
  };
  // Add other relevant fields if needed
}

interface SummarizationResult {
    summary: string | null;
    tokensUsed: number | null;
}

/**
 * Parses and validates the incoming request for summarizing a conversation.
 * Checks for POST method and a non-empty 'messages' array.
 *
 * @param req The incoming request object.
 * @returns The validated array of messages.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<{ messages: ConversationMessage[] }> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed");
  }

  let body: { messages?: ConversationMessage[] };
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }

  const { messages } = body;

  if (!messages || !Array.isArray(messages)) {
    // Allow empty array, handle in summarization logic
    console.warn("Received request with missing or invalid 'messages' array.");
    return { messages: [] };
  }

  // Optional: Validate structure of individual messages if needed

  return { messages };
}

/**
 * Summarizes a conversation using OpenAI.
 *
 * @param openaiClient Initialized OpenAI client.
 * @param messages Array of conversation messages.
 * @returns An object containing the summary and tokens used.
 * @throws Error if OpenAI API call fails.
 */
export async function summarizeWithOpenAI(
    openaiClient: OpenAI,
    messages: ConversationMessage[]
): Promise<SummarizationResult> {
    if (messages.length === 0) {
        return { summary: null, tokensUsed: 0 }; // No summary for empty conversation
    }

    // Format messages for the prompt (adjust sender logic if needed)
    const conversationText = messages
        .map((message) => `${message.sender_id || 'Unknown Sender'}: ${message.content || ''}`)
        .join('\n');

    const prompt = `
      You are an expert at summarizing conversations. Please provide a concise summary of the following conversation:

      ${conversationText}

      Summary:
    `;

    try {
        console.log("Requesting conversation summary from OpenAI...");
        const completion = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150, // Adjust as needed
            temperature: 0.7,
        });

        const summary = completion.choices[0]?.message?.content?.trim() || null;
        const tokensUsed = completion.usage?.total_tokens || null;

        console.log(`Summary generated. Tokens used: ${tokensUsed}`);
        return { summary, tokensUsed };

    } catch (error) {
        console.error('Error calling OpenAI for summarization:', error);
        throw new Error(`OpenAI API error during summarization: ${error.message}`);
    }
}

/**
 * Tracks token usage by inserting a record into the database.
 * Extracts userId and conversationId from the messages array (best effort).
 * Logs errors but does not throw to avoid failing the main summarization request.
 *
 * @param supabaseClient Supabase client instance (Service Role recommended).
 * @param messages The array of conversation messages.
 * @param tokensUsed The number of tokens used for the summarization.
 */
export async function trackTokenUsageDb(
    supabaseClient: SupabaseClient<Database>,
    messages: ConversationMessage[],
    tokensUsed: number | null
): Promise<void> {
    if (tokensUsed === null || tokensUsed <= 0 || messages.length === 0) {
        console.log("Skipping token tracking due to zero tokens or no messages.");
        return; // Don't track if no tokens were used or no messages provided
    }

    // Attempt to extract identifiers - **This is fragile, consider passing explicitly**
    const firstMessage = messages[0];
    const userId = firstMessage?.sender_id || firstMessage?.conversation?.sender_id;
    const conversationId = firstMessage?.conversation?.conversation_id;

    if (!userId) {
        console.warn("Could not determine userId from messages for token tracking.");
        // Decide if tracking should proceed without userId or be skipped
        // return; // Option: Skip if userId is essential
    }
     if (!conversationId) {
        console.warn("Could not determine conversationId from messages for token tracking.");
        // Decide if tracking should proceed without conversationId or be skipped
    }


    try {
        console.log(`Tracking token usage: User=${userId || 'Unknown'}, Conv=${conversationId || 'Unknown'}, Tokens=${tokensUsed}`);
        const { error } = await supabaseClient
            .from('token_usage')
            .insert([
                {
                    // If userId couldn't be determined, decide how to handle:
                    // Option A: Insert with a placeholder/null (if DB allows)
                    // Option B: Don't insert (handled by the check above)
                    // Option C: Throw error (makes tracking critical path)
                    // Current implementation assumes DB allows null or a default for user_id if not found.
                    // A required user_id would need the check above to potentially return early.
                    user_id: userId || 'unknown-user-id', // Use placeholder or handle null based on DB schema
                    tokens_used: tokensUsed,
                    conversation_id: conversationId // Can be null if not found
                }
            ]);

        if (error) {
            console.error("Error inserting token usage record:", error);
            // Log error but don't fail the main function
        } else {
            console.log("Token usage tracked successfully.");
        }
    } catch (dbError) {
        console.error("Unexpected error during token usage tracking:", dbError);
        // Log error but don't fail the main function
    }
}
