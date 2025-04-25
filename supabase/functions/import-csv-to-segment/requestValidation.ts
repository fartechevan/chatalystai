
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { ImportCsvRequest } from "./types.ts";

/**
 * Parses and validates the incoming request for importing CSV data.
 * Checks for POST method and required fields.
 *
 * @param req The incoming request object.
 * @returns The validated request payload.
 * @throws Error if validation fails.
 */
export async function parseAndValidateRequest(req: Request): Promise<ImportCsvRequest> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed");
  }

  let body: Partial<ImportCsvRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }

  const { csvData, segmentId, importMode, columnMapping, duplicateAction } = body;

  if (!csvData || !segmentId) {
    throw new Error("CSV data (csvData) and Segment ID (segmentId) are required");
  }
  if (importMode && !['save_new', 'existing_only'].includes(importMode)) {
      throw new Error("Invalid importMode. Must be 'save_new' or 'existing_only'.");
  }
   if (duplicateAction && !['skip', 'add'].includes(duplicateAction)) {
      throw new Error("Invalid duplicateAction. Must be 'skip' or 'add'.");
  }

  return {
      csvData,
      segmentId,
      importMode: importMode || 'save_new', // Default mode
      columnMapping,
      duplicateAction: duplicateAction || 'skip' // Default action
  };
}
