
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { Database } from "../_shared/database.types.ts";

export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerResponse = Pick<Database["public"]["Tables"]["customers"]["Row"], "id" | "phone_number">;
export type SegmentContactInsert = Database["public"]["Tables"]["segment_contacts"]["Insert"];

// Interface for raw parsed CSV row data
export interface CsvRow {
  phone_number: string;
  name?: string;
  [key: string]: string | undefined; // Allow other columns
}

// Interface for request payload
export interface ImportCsvRequest {
  csvData: string;
  segmentId: string;
  importMode?: 'save_new' | 'existing_only';
  columnMapping?: { [key: string]: string };
  duplicateAction?: 'skip' | 'add';
}

// Interface for duplicate tracking
export interface DuplicateInfo {
  csvRowIndex: number;
  csvData: CsvRow;
  existingContactId: string;
}
