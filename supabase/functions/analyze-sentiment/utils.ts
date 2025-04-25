
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "https://esm.sh/openai@4.52.7"; // Updated to use fully qualified URL path
import { Database } from "../_shared/database.types.ts";

// Define the expected type for OpenAI messages
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AnalysisResult {
  sentiment: "bad" | "moderate" | "good" | "unknown";
  description: string;
}

/**
 * Parses the request body to extract the conversationId.
 * @param req The incoming request object.
 * @returns The conversationId.
 * @throws Error if request body is invalid or conversationId is missing.
 */
export async function parseRequest(req: Request): Promise<{ conversationId: string }> {
  let body: { conversationId?: string };
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }

  const { conversationId } = body;
  if (!conversationId) {
    throw new Error("Missing required field: conversationId");
  }
  return { conversationId };
}

/**
 * Fetches messages and participant data for a conversation and formats it into a transcript string.
 * @param supabase The Supabase client instance (Service Role recommended for full access).
 * @param conversationId The ID of the conversation.
 * @returns The formatted conversation transcript string.
 * @throws Error if database fetching fails or no messages are found.
 */
export async function fetchAndFormatConversation(
  supabase: SupabaseClient<Database>,
  conversationId: string
): Promise<string> {
  // Fetch messages
  const { data: conversationMessages, error: messagesError } = await supabase
    .from('messages')
    .select('content, sender_participant_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, messagesError);
    throw new Error(`Database error fetching messages: ${messagesError.message}`);
  }

  if (!conversationMessages || conversationMessages.length === 0) {
    // Return empty string or throw specific error if analysis requires messages
    // throw new Error("No messages found for analysis.");
    return ""; // Return empty string, let the caller decide how to handle
  }

  // Fetch participant details
  const participantIds = conversationMessages
    .map(msg => msg.sender_participant_id)
    .filter((id): id is string => !!id); // Type guard for filtering nulls

  let formattedMessages: OpenAIMessage[] = [];

  if (participantIds.length > 0) {
    const { data: participants, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id, customer_id')
      .in('id', participantIds);

    if (participantError) {
      console.error(`Error fetching participants for conversation ${conversationId}:`, participantError);
      // Decide how critical participant info is. Maybe proceed with default roles?
      // For now, throw error.
      throw new Error(`Database error fetching participants: ${participantError.message}`);
    }

    const participantMap = new Map(participants?.map(p => [p.id, p]) || []);

    formattedMessages = conversationMessages.map((msg): OpenAIMessage => {
      const participant = participantMap.get(msg.sender_participant_id || ""); // Handle potential null sender_participant_id
      const role: 'user' | 'assistant' = participant?.customer_id ? 'user' : 'assistant';
      return {
        role: role,
        content: msg.content || '',
      };
    });
  } else {
    // Fallback if no participant IDs (e.g., system messages or data issue)
    formattedMessages = conversationMessages.map((msg): OpenAIMessage => ({
      role: 'user', // Default role
      content: msg.content || '',
    }));
  }

  // Concatenate messages into a single string transcript
  const fullConversationText = formattedMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  return fullConversationText;
}

/**
 * Analyzes the sentiment of a conversation transcript using OpenAI.
 * @param openaiClient The initialized OpenAI client.
 * @param transcript The conversation transcript string.
 * @returns The sentiment analysis result { sentiment, description }.
 * @throws Error if OpenAI API call fails or returns invalid data.
 */
export async function analyzeSentimentWithOpenAI(
  openaiClient: OpenAI,
  transcript: string
): Promise<AnalysisResult> {
   if (!transcript) {
     // Handle case where fetchAndFormatConversation returned empty string
     return { sentiment: 'unknown', description: 'No messages found for analysis.' };
   }

  const systemPrompt = `Analyze the following conversation transcript and determine the overall sentiment. Respond ONLY with a JSON object containing: "sentiment" (string: "bad", "moderate", or "good") and "description" (string: a brief explanation for the sentiment, focusing on the effectiveness of the interaction in helping the customer). Example: {"sentiment": "good", "description": "The assistant effectively resolved the user's issue."}`;

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini', // Use the desired model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent JSON output
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI response content is empty.");
    }

    // Parse the JSON response from OpenAI
    const analysisResult = JSON.parse(content) as Partial<AnalysisResult>;

    // Validate the parsed result
    if (!analysisResult.sentiment || !analysisResult.description ||
        !["bad", "moderate", "good"].includes(analysisResult.sentiment)) {
       console.error("Invalid JSON structure received from OpenAI:", analysisResult);
       throw new Error("OpenAI returned invalid JSON format for sentiment analysis.");
    }

    return analysisResult as AnalysisResult; // Type assertion after validation

  } catch (error) {
    console.error('Error calling OpenAI for sentiment analysis:', error);
    if (error instanceof SyntaxError) {
       throw new Error("Failed to parse JSON response from OpenAI.");
    }
    throw new Error(`OpenAI API error during sentiment analysis: ${error.message}`);
  }
}
