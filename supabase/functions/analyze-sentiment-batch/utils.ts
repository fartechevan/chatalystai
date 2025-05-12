// @ts-expect-error deno-types
import { OpenAI } from "https://deno.land/x/openai@v4.24.1/mod.ts";
// @ts-expect-error deno-types
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Conversation {
  conversation_id: string; // Corrected from id to conversation_id
  created_at: string;
  // Add other relevant fields if known/needed for type safety
}

export interface BatchRequest {
  startDate: string;
  endDate: string;
}

export async function parseBatchRequest(req: Request): Promise<BatchRequest> {
  try {
    const body = await req.json();
    if (!body.startDate || !body.endDate) {
      throw new Error("Missing required fields: startDate and endDate");
    }
    // Basic date validation (can be enhanced)
    if (isNaN(new Date(body.startDate).getTime()) || isNaN(new Date(body.endDate).getTime())) {
      throw new Error("Invalid date format for startDate or endDate. Use ISO 8601 format (YYYY-MM-DD).");
    }
    if (new Date(body.startDate) > new Date(body.endDate)) {
        throw new Error("startDate cannot be after endDate.");
    }
    return { startDate: body.startDate, endDate: body.endDate };
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error("Invalid JSON body");
    }
    throw e;
  }
}

// Assuming 'conversations' table has 'id' and 'created_at' (timestamp)
// And 'messages' table has 'conversation_id', 'sender', 'message_text', 'created_at'
export async function fetchConversationsByDateRange(
  supabaseClient: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<Conversation[]> {
  const { data, error } = await supabaseClient
    .from('conversations') // Assuming table name is 'conversations'
    .select('conversation_id, created_at') // Corrected from id to conversation_id
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Database error fetching conversations by date range:', error);
    throw new Error("Database error fetching conversations: " + error.message);
  }
  return data || [];
}

export async function formatConversationTranscript(
  supabaseClient: SupabaseClient,
  conversationId: string
): Promise<string> {
  const { data: messages, error } = await supabaseClient
    .from('messages') // Assuming table name for messages
    .select('sender_participant_id, content, created_at') // Corrected 'sender' to 'sender_participant_id'
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Database error fetching messages for conversation " + conversationId + ":", error);
    throw new Error("Database error fetching messages: " + error.message);
  }

  if (!messages || messages.length === 0) {
    // console.warn(\`No messages found for conversation \${conversationId}\`);
    return ""; // Return empty string if no messages
  }

  return messages
    .map(msg => (msg.sender_participant_id || 'UnknownParticipant') + ": " + (msg.content || '')) // Used sender_participant_id
    .join('\\n');
}

export async function analyzeSentimentWithOpenAI(
  openai: OpenAI,
  transcript: string
): Promise<{ sentiment: string; description: string }> {
  if (!transcript || transcript.trim() === "") {
    return { sentiment: "Neutral", description: "No content to analyze." };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert. Analyze the sentiment of the following conversation transcript. Respond with JSON containing two keys: 'sentiment' (string, can be 'Positive', 'Negative', or 'Neutral') and 'description' (string, a brief explanation of the sentiment, max 1-2 sentences)."
        },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Lower temperature for more deterministic sentiment
      max_tokens: 150, // Sufficient for sentiment and brief description
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned no content for sentiment analysis.");
    }

    const result = JSON.parse(content);

    if (!result.sentiment || !result.description) {
        console.error("OpenAI response missing sentiment or description:", result);
        throw new Error("OpenAI returned invalid JSON format for sentiment analysis (missing keys).");
    }
    if (!["Positive", "Negative", "Neutral"].includes(result.sentiment)) {
        console.warn("OpenAI returned unexpected sentiment value: " + result.sentiment);
        // Optionally, normalize or default here, e.g., result.sentiment = "Neutral";
    }

    return {
      sentiment: result.sentiment,
      description: result.description,
    };
  } catch (error) {
    console.error("Error during OpenAI sentiment analysis:", error);
    if (error.message.includes("JSON.parse")) {
        throw new Error("Failed to parse JSON response from OpenAI for sentiment analysis.");
    }
    throw new Error("OpenAI API error during sentiment analysis: " + error.message);
  }
}
