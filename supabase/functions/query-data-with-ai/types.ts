
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { Json } from "../_shared/database.types.ts";

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
export interface RelevantSchemaPart {
  id: string;
  schema_name: string;
  table_name: string;
  column_name: string | null; // Column name can be null for table-level descriptions
  description: string;
  similarity: number;
}

export type SqlQueryResult = Json;

/**
 * Structure for data intended for chart rendering (e.g., pie chart).
 */
export type ChartData = {
  name: string; // Category label
  value: number; // Numeric value for the category
};
