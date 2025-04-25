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
  schemaParts: RelevantSchemaPart[]
): Promise<string> {
  const schemaString = schemaParts.map(p => `${p.table_name}(${p.column_name || 'TABLE'}) - ${p.description}`).join('\n');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  history.forEach(msg => {
    messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
  });
  messages.push({
    role: 'system',
    content: `You are a SQL expert that generates safe, read-only PostgreSQL queries. Follow these rules strictly:
1. ONLY generate SELECT statements
2. Use only the schema information provided
3. Always add proper table aliases
4. Use proper column qualifiers (table.column)
5. Add WHERE clauses to filter data appropriately
6. Use JOINs when needed to connect related data
7. Handle NULL values safely
8. If the query is impossible, respond with "QUERY_NOT_POSSIBLE"

Examples:
Schema:
customers(name) - Customer names and details
messages(content) - Message content and metadata

Query: "Show me all customers named John"
Response: SELECT c.name FROM customers c WHERE c.name ILIKE '%John%'

Query: "List messages from last week"
Response: SELECT m.content, m.created_at FROM messages m WHERE m.created_at >= NOW() - INTERVAL '7 days'

Available Schema:
${schemaString}

Generate SQL for this query: "${query}"`
  });

  console.log("Sending prompt to OpenAI for SQL generation...");
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.2,
      max_tokens: 250,
      stop: ["--", ";"],
    });

    const generatedSql = completion.choices[0]?.message?.content?.trim() || "";
    console.log("Generated SQL attempt:", generatedSql);

    if (!generatedSql || generatedSql === "QUERY_NOT_POSSIBLE" || !generatedSql.toUpperCase().startsWith("SELECT")) {
      throw new Error("SQL generation failed or deemed unsafe/impossible.");
    }
    return generatedSql.replace(/;$/, '');

  } catch (error) {
     console.error("Error calling OpenAI for SQL generation:", error);
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
