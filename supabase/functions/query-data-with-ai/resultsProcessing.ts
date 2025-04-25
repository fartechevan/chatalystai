
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import OpenAI from "https://esm.sh/openai@4.52.7";
import { HistoryMessage } from "./types.ts";
import { Json } from "../_shared/database.types.ts";

/**
 * Summarizes the query results in natural language using OpenAI.
 */
export async function summarizeResults(
  openaiClient: OpenAI,
  query: string,
  history: HistoryMessage[],
  results: Json
): Promise<string> {
  let resultString: string;
  let resultSummaryPrompt: string;

  if (results && Array.isArray(results)) {
    if (results.length === 0) {
      return "I ran the query, but it returned no results matching your request.";
    }
    resultString = JSON.stringify(results, null, 2);
    resultSummaryPrompt = `You are an expert data analyst explaining query results in clear, natural language. Follow these guidelines:

1. Answer Format:
   - For lists: Use bullet points (markdown '-' or '*')
   - For aggregates: Give a clear summary sentence
   - For complex data: Break down into digestible parts

2. Language Style:
   - Use natural, conversational tone
   - Avoid technical terms like JSON, SQL, database
   - Be concise but informative
   - Focus on insights, not raw data

3. Examples:
   Query: "Show me top customers"
   Data: [{"name": "John", "orders": 50}, {"name": "Alice", "orders": 45}]
   Response: "Here are your most active customers:
   - John with 50 orders
   - Alice with 45 orders"

   Query: "What's the total sales?"
   Data: [{"total": 150000}]
   Response: "Total sales amount to $150,000"

User's Query: "${query}"
Data:\n\`\`\`json\n${resultString}\n\`\`\``;

  } else {
     console.warn("Query result format was not an array or was empty/null:", results);
     resultString = JSON.stringify(results);
     resultSummaryPrompt = `You are an expert data analyst explaining query results in clear, natural language. The user's query led to the following data. Explain this result concisely and non-technically, directly answering the user's query: "${query}". Data: ${resultString}`;
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  history.forEach(msg => {
    messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
  });
  messages.push({ role: 'user', content: query });
  messages.push({ role: 'system', content: resultSummaryPrompt });

  console.log("Sending result to OpenAI for summarization...");
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.5,
      max_tokens: 200,
    });
    const finalResponse = completion.choices[0]?.message?.content?.trim();
    if (!finalResponse) {
       throw new Error("OpenAI returned empty summary.");
    }
    console.log("OpenAI Summarized Response:", finalResponse);
    return finalResponse;
  } catch (error) {
    console.error("Error calling OpenAI for summarization:", error);
    return `I found the following data, but had trouble summarizing it:\n\`\`\`json\n${resultString}\n\`\`\``;
  }
}
