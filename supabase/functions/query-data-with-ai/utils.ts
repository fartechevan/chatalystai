/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "https://esm.sh/openai@4.52.7"; // Updated to use fully qualified URL
import { Database, Json } from "../_shared/database.types.ts"; // Import Json type
import { generateEmbedding as sharedGenerateEmbedding } from "../_shared/openaiUtils.ts"; // Use shared embedding function

// Type for chat history messages passed in the request
export type HistoryMessage = {
  sender: 'user' | 'bot';
  text: string;
};

// Type for the request payload
export interface QueryRequest {
  query: string;
  history?: HistoryMessage[];
}

// Type for relevant schema parts returned by RPC
interface RelevantSchemaPart {
  id: string;
  schema_name: string;
  table_name: string;
  column_name: string | null; // Column name can be null for table-level descriptions
  description: string;
  similarity: number;
}

/**
 * Parses and validates the incoming request for querying data with AI.
 * Checks for POST method and required 'query' field. Validates 'history' array format.
 *
 * @param req The incoming request object.
 * @returns The validated query and history.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<QueryRequest> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed");
  }

  let body: Partial<QueryRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }

  const { query, history = [] } = body; // Default history to empty array

  if (!query || typeof query !== 'string') {
    throw new Error("Missing or invalid 'query' parameter in request body.");
  }
  if (!Array.isArray(history)) {
    console.warn("Received invalid format for history, ignoring.");
    return { query, history: [] }; // Return empty history if format is wrong
  }
  // Optional: Validate individual history message structure

  return { query, history };
}

/**
 * Generates embedding for the user query using the shared utility.
 * @param query The user's query text.
 * @returns The embedding vector.
 * @throws Error if embedding generation fails.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embedding = await sharedGenerateEmbedding(query); // Assumes shared openai client is used internally
  if (!embedding) {
    throw new Error("Failed to generate embedding for the query.");
  }
  return embedding;
}

/**
 * Finds relevant schema parts based on the query embedding using an RPC call.
 *
 * @param supabaseClient Supabase client instance (Service Role recommended).
 * @param queryEmbedding The embedding vector of the user query.
 * @param matchThreshold Minimum similarity threshold.
 * @param matchCount Maximum number of schema parts to return.
 * @returns An array of relevant schema parts.
 * @throws Error if the RPC call fails.
 */
export async function findRelevantSchema(
  supabaseClient: SupabaseClient<Database>,
  queryEmbedding: number[],
  matchThreshold: number = 0.7,
  matchCount: number = 5
): Promise<RelevantSchemaPart[]> {
  console.log(`Calling match_schema_embeddings RPC with threshold: ${matchThreshold}, count: ${matchCount}`);

  // Convert number[] embedding to string format '[1,2,3]' for the RPC call
  const embeddingString = JSON.stringify(queryEmbedding);

  const { data, error } = await supabaseClient.rpc('match_schema_embeddings', {
    query_embedding: embeddingString, // Pass string representation
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("Error calling match_schema_embeddings RPC:", error);
    throw new Error(`Failed to query schema embeddings via RPC: ${error.message}`);
  }

  if (!data) {
     console.warn("match_schema_embeddings RPC returned null data, but no error.");
     return []; // Return empty array if no matches found
  }

  console.log(`Found ${data.length} relevant schema parts via RPC.`);
  // Assuming the RPC returns data matching the RelevantSchemaPart interface
  return data as RelevantSchemaPart[];
}

/**
 * Generates a safe, read-only SQL query using OpenAI based on the query, history, and schema.
 *
 * @param openaiClient Initialized OpenAI client.
 * @param query The current user query.
 * @param history The conversation history.
 * @param schemaParts Relevant schema parts found.
 * @returns The generated SQL query string.
 * @throws Error if SQL generation fails or is deemed unsafe/impossible.
 */
export async function generateSqlQuery(
  openaiClient: OpenAI,
  query: string,
  history: HistoryMessage[],
  schemaParts: RelevantSchemaPart[]
): Promise<string> {
  const schemaString = schemaParts.map(p => `${p.table_name}(${p.column_name || 'TABLE'}) - ${p.description}`).join('\n');
  const historyString = history.map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');

  // Construct messages array for OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  history.forEach(msg => {
    messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
  });
  messages.push({
    role: 'system',
    content: `You are a SQL generation assistant. Given potentially relevant schema and a user query (potentially referencing conversation history), generate a safe, read-only PostgreSQL query. Use only the provided schema. If impossible, respond with "QUERY_NOT_POSSIBLE". Respond ONLY with the raw SQL query.`
  });
  messages.push({
    role: 'user',
    content: `Relevant Schema:\n${schemaString}\n\nGenerate SQL for this query: "${query}"`
  });

  console.log("Sending prompt to OpenAI for SQL generation...");
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo", // Consider GPT-4 for complex queries
      messages: messages,
      temperature: 0.2,
      max_tokens: 250,
      stop: ["--", ";"],
    });

    const generatedSql = completion.choices[0]?.message?.content?.trim() || ""; // Use const
    console.log("Generated SQL attempt:", generatedSql);

    if (!generatedSql || generatedSql === "QUERY_NOT_POSSIBLE" || !generatedSql.toUpperCase().startsWith("SELECT")) {
      throw new Error("SQL generation failed or deemed unsafe/impossible.");
    }
    // Return SQL without trailing semicolon as it might interfere with RPC call
    return generatedSql.replace(/;$/, '');

  } catch (error) {
     console.error("Error calling OpenAI for SQL generation:", error);
     throw new Error(`OpenAI API error during SQL generation: ${error.message}`);
  }
}

/**
 * Executes a dynamically generated SQL query using a safe RPC function.
 *
 * @param supabaseClient Supabase client instance (Service Role recommended).
 * @param sql The SQL query string to execute.
 * @returns The JSON result from the executed query.
 * @throws Error if the RPC call fails.
 */
export async function executeGeneratedSql(
  supabaseClient: SupabaseClient<Database>,
  sql: string
): Promise<Json> { 
  console.log("Executing generated SQL via RPC:", sql);
  const { data, error } = await supabaseClient.rpc(
      'execute_dynamic_sql',
      { sql_query: sql }
  );

  if (error) {
    console.error("Error executing generated SQL via RPC:", error);
    throw new Error(`Failed to execute the data query via RPC: ${error.message}`);
  }
  console.log("SQL Query Result (from RPC):", data);
  return data; // Return the data directly as returned by the RPC
}

/**
 * Summarizes the query results in natural language using OpenAI.
 *
 * @param openaiClient Initialized OpenAI client.
 * @param query The original user query.
 * @param history The conversation history.
 * @param results The JSON results from the executed SQL query.
 * @returns A natural language summary of the results.
 * @throws Error if summarization fails.
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
    resultSummaryPrompt = `You are an assistant explaining database query results. The user's query led to the following data. Explain this result concisely and non-technically, directly answering the user's last query based on the conversation history and the data.
- If the data represents a list of items (e.g., names, titles, summaries), present the key information as a bulleted list (using markdown '-' or '*').
- Otherwise, provide a brief summary sentence.
- Avoid mentioning JSON or SQL.
Data:\n\`\`\`json\n${resultString}\n\`\`\``;

  } else {
     // Handle non-array or null/undefined results
     console.warn("Query result format was not an array or was empty/null:", results);
     resultString = JSON.stringify(results); // Attempt to stringify anyway
     resultSummaryPrompt = `You are an assistant explaining database query results. The user's query led to the following data. Explain this result concisely and non-technically, directly answering the user's last query based on the conversation history and the data. Avoid mentioning JSON or SQL. Data: ${resultString}`;
  }

  // Construct messages array for summarization
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  history.forEach(msg => {
    messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
  });
  messages.push({ role: 'user', content: query }); // Add the user's last query
  messages.push({ role: 'system', content: resultSummaryPrompt });

  console.log("Sending result to OpenAI for summarization...");
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.5,
      max_tokens: 200, // Increased slightly for potentially longer summaries/lists
    });
    const finalResponse = completion.choices[0]?.message?.content?.trim();
    if (!finalResponse) {
       throw new Error("OpenAI returned empty summary.");
    }
    console.log("OpenAI Summarized Response:", finalResponse);
    return finalResponse;
  } catch (error) {
    console.error("Error calling OpenAI for summarization:", error);
    // Fallback to showing raw data if summarization fails
    return `I found the following data, but had trouble summarizing it:\n\`\`\`json\n${resultString}\n\`\`\``;
  }
}
