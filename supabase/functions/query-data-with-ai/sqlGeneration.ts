/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import OpenAI from "https://esm.sh/openai@4.52.7";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database, Json } from "../_shared/database.types.ts";
import { HistoryMessage, RelevantSchemaPart } from "./types.ts";

/**
 * Generates a safe, read-only SQL query using OpenAI.
 */
export async function generateSqlQuery(
  openaiClient: OpenAI,
  query: string,
  history: HistoryMessage[],
  schemaParts: RelevantSchemaPart[] // This now includes data_type
): Promise<string> {
  // Updated to include data_type in the schema string for OpenAI
  const schemaString = schemaParts.map(p => {
    let partStr = `${p.table_name}(`;
    if (p.column_name) {
      const dataTypeDisplay = p.data_type || 'UNKNOWN_TYPE';
      partStr += `${p.column_name} ${dataTypeDisplay}`; // Include data_type
    } else {
      partStr += 'TABLE';
    }
    partStr += `) - ${p.description}`;
    return partStr;
  }).join('\n');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  history.forEach(msg => {
    messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
  });
  messages.push({
    role: 'system',
    content: `You are a SQL expert that generates safe, read-only PostgreSQL queries. Follow these rules strictly:
1. ONLY generate SELECT statements.
2. Use only the schema information provided.
3. Always add proper table aliases (e.g., "table_alias.column_name").
4. Use proper column qualifiers (e.g., "table_name.column_name" or "alias.column_name").
5. Add WHERE clauses to filter data appropriately. If a query seems too broad for a table (e.g., asking for all sentiment analysis without a date), consider if clarification is needed.
6. Use JOINs when needed to connect related data.
7. Handle NULL values safely (e.g., using COALESCE or IS NULL checks).
8. When comparing a UUID column with a string literal, ensure the string literal is explicitly cast to the UUID type (e.g., \\\`uuid_column = 'your-uuid-string'::uuid\\\`).
9. If the user's query is too vague for the provided schema (e.g., lacks common mandatory filters like date ranges for time-series data such as 'batch_sentiment_analysis', or specific identifiers for tables that require them), respond with "CLARIFICATION_NEEDED:" followed by a concise question asking the user for the missing details. For example: "CLARIFICATION_NEEDED: To analyze batch sentiment, please specify a date range."
10. If the query is fundamentally impossible (e.g., requests data modification, involves tables/columns not in the schema, or is a non-sensical request even with clarification), or if it requests unsafe operations, respond ONLY with the exact string "QUERY_NOT_POSSIBLE".
11. If you can generate a valid SQL query, provide ONLY the SQL query. Do not add any explanations or surrounding text.

Examples:
Schema:
customers(id, name, email) - Customer names and details
orders(id, customer_id, order_date, total_amount) - Customer orders
batch_sentiment_analysis(id, analysis_date, positive_count, negative_count, neutral_count) - Daily sentiment counts

Query: "Show me all customers named John"
Response: SELECT c.id, c.name, c.email FROM customers AS c WHERE c.name ILIKE '%John%'

Query: "List orders from last week"
Response: SELECT o.id, o.customer_id, o.order_date, o.total_amount FROM orders AS o WHERE o.order_date >= NOW() - INTERVAL '7 days'

Query: "Get details for item 'a1b2c3d4-e5f6-7890-1234-567890abcdef'" (Given schema: items(item_id uuid) - Item details)
Response: SELECT item.item_id FROM items AS item WHERE item.item_id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'::uuid

Query: "What's the sentiment?" (Given batch_sentiment_analysis schema)
Response: CLARIFICATION_NEEDED: To check sentiment from batch_sentiment_analysis, please provide a date or date range for the analysis.

Query: "Delete all users"
Response: QUERY_NOT_POSSIBLE

Available Schema:
${schemaString}

Based on the rules, the available schema, and the user's query, generate the SQL query, ask for clarification, or state that the query is not possible.
User Query: "${query}"`
  });

  console.log("Sending prompt to OpenAI for SQL generation...");
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo", // Consider gpt-4-turbo for more complex reasoning if needed
      messages: messages,
      temperature: 0.1, // Lower temperature for more deterministic SQL/clarification
      max_tokens: 300,  // Slightly increased for potentially longer clarification questions
      stop: ["--"], // Remove semicolon as a stop token to allow it in clarification
    });

    const openAiOutput = completion.choices[0]?.message?.content?.trim() || "";
    console.log("OpenAI output for SQL/Clarification:", openAiOutput);

    if (openAiOutput.startsWith("CLARIFICATION_NEEDED:")) {
      // Return the clarification question (strip the prefix)
      return openAiOutput.substring("CLARIFICATION_NEEDED:".length).trim();
    }

    if (!openAiOutput || openAiOutput === "QUERY_NOT_POSSIBLE" || !openAiOutput.toUpperCase().startsWith("SELECT")) {
      // This covers empty response, explicit "QUERY_NOT_POSSIBLE", or non-SELECT statements
      throw new Error("SQL generation failed or deemed unsafe/impossible.");
    }
    
    // It's an SQL query
    return openAiOutput.replace(/;$/, ''); // Remove trailing semicolon if any

  } catch (error) {
     console.error("Error calling OpenAI for SQL generation:", error);
     // Ensure the error message passed up is consistent for the handler in index.ts
     if (error.message === "SQL generation failed or deemed unsafe/impossible.") {
        throw error; // Re-throw if it's already our specific error
     }
     // For other OpenAI API errors, wrap them
     throw new Error(`OpenAI API error during SQL generation: ${error.message}`);
  }
}

/**
 * Executes a dynamically generated SQL query using a safe RPC function.
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
  return data;
}
