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

// Simple fallback sentiment analysis based on keywords
function fallbackSentimentAnalysis(transcript: string): { sentiment: string; description: string } {
  const lowerTranscript = transcript.toLowerCase();
  
  // Define sentiment keywords
  const positiveKeywords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing', 'wonderful', 'perfect', 'thank you', 'thanks'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'problem', 'issue', 'complaint', 'wrong', 'error'];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  positiveKeywords.forEach(keyword => {
    const matches = (lowerTranscript.match(new RegExp(keyword, 'g')) || []).length;
    positiveScore += matches;
  });
  
  negativeKeywords.forEach(keyword => {
    const matches = (lowerTranscript.match(new RegExp(keyword, 'g')) || []).length;
    negativeScore += matches;
  });
  
  if (positiveScore > negativeScore) {
    return { sentiment: "Positive", description: "Fallback analysis detected positive sentiment based on keyword analysis." };
  } else if (negativeScore > positiveScore) {
    return { sentiment: "Negative", description: "Fallback analysis detected negative sentiment based on keyword analysis." };
  } else {
    return { sentiment: "Neutral", description: "Fallback analysis could not determine clear sentiment polarity." };
  }
}

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if error is retryable
      const isRetryable = error.message.includes('rate limit') || 
                         error.message.includes('timeout') ||
                         error.message.includes('network') ||
                         error.message.includes('503') ||
                         error.message.includes('502');
      
      if (!isRetryable) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Retrying OpenAI request in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function analyzeSentimentWithOpenAI(
  openai: OpenAI,
  transcript: string
): Promise<{ sentiment: string; description: string }> {
  if (!transcript || transcript.trim() === "") {
    return { sentiment: "Neutral", description: "No content to analyze." };
  }

  try {
    const result = await retryWithBackoff(async () => {
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
        temperature: 0.1,
        max_tokens: 150,
        timeout: 30000, // 30 second timeout
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned no content for sentiment analysis.");
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse OpenAI JSON response:", content);
        throw new Error("Failed to parse JSON response from OpenAI for sentiment analysis.");
      }

      if (!parsedResult.sentiment || !parsedResult.description) {
        console.error("OpenAI response missing sentiment or description:", parsedResult);
        throw new Error("OpenAI returned invalid JSON format for sentiment analysis (missing keys).");
      }
      
      // Normalize unexpected sentiment values
      if (!["Positive", "Negative", "Neutral"].includes(parsedResult.sentiment)) {
        console.warn("OpenAI returned unexpected sentiment value: " + parsedResult.sentiment + ", defaulting to Neutral");
        parsedResult.sentiment = "Neutral";
        parsedResult.description = "Sentiment normalized due to unexpected value: " + parsedResult.description;
      }

      return {
        sentiment: parsedResult.sentiment,
        description: parsedResult.description,
      };
    }, 3, 1000);
    
    return result;
  } catch (error) {
    console.error("OpenAI sentiment analysis failed after retries, using fallback:", error.message);
    
    // Use fallback sentiment analysis
    const fallbackResult = fallbackSentimentAnalysis(transcript);
    console.log("Using fallback sentiment analysis result:", fallbackResult);
    
    return fallbackResult;
  }
}
