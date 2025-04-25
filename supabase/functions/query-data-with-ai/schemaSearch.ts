
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";
import { generateEmbedding as sharedGenerateEmbedding } from "../_shared/openaiUtils.ts";
import { RelevantSchemaPart } from "./types.ts";

/**
 * Generates embedding for the user query using the shared utility.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embedding = await sharedGenerateEmbedding(query);
  if (!embedding) {
    throw new Error("Failed to generate embedding for the query.");
  }
  return embedding;
}

/**
 * Finds relevant schema parts based on the query embedding using an RPC call.
 */
export async function findRelevantSchema(
  supabaseClient: SupabaseClient<Database>,
  queryEmbedding: number[],
  matchThreshold: number = 0.7,
  matchCount: number = 5
): Promise<RelevantSchemaPart[]> {
  console.log(`Calling match_schema_embeddings RPC with threshold: ${matchThreshold}, count: ${matchCount}`);

  const embeddingString = JSON.stringify(queryEmbedding);

  const { data, error } = await supabaseClient.rpc('match_schema_embeddings', {
    query_embedding: embeddingString,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("Error calling match_schema_embeddings RPC:", error);
    throw new Error(`Failed to query schema embeddings via RPC: ${error.message}`);
  }

  if (!data) {
     console.warn("match_schema_embeddings RPC returned null data, but no error.");
     return [];
  }

  console.log(`Found ${data.length} relevant schema parts via RPC.`);
  return data as RelevantSchemaPart[];
}
