
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { QueryRequest } from "./types.ts";

/**
 * Parses and validates the incoming request for querying data with AI.
 * Checks for POST method and required 'query' field. Validates 'history' array format.
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

  return { query, history };
}
