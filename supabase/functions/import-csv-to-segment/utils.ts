/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { parse } from "https://deno.land/std@0.177.0/csv/mod.ts"; // Updated to a working version
import { Database } from "../_shared/database.types.ts";

export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"]; // Added export
type CustomerResponse = Pick<Database["public"]["Tables"]["customers"]["Row"], "id" | "phone_number">;
type SegmentContactInsert = Database["public"]["Tables"]["segment_contacts"]["Insert"];

// Define expected CSV headers (lowercase for case-insensitive matching)
const EXPECTED_PHONE_HEADER = "phone_number";
const OPTIONAL_NAME_HEADER = "name";

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
    // TODO: Adapt for multipart/form-data if handling actual file uploads
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

/**
 * Parses CSV string data, validates headers and rows.
 *
 * @param csvString The raw CSV data as a string.
 * @param columnMapping Optional mapping for headers.
 * @returns An array of parsed CsvRow objects.
 * @throws Error on parsing errors or validation failures.
 */
export async function parseCsvData(
    csvString: string,
    columnMapping?: { [key: string]: string }
): Promise<CsvRow[]> {
    let parsedData: CsvRow[];
    let headers: string[];
    try {
        const result = await parse(csvString, { skipFirstRow: true });
        const rawHeaders = await parse(csvString, { skipFirstRow: false, parse: (input) => input });
        if (!rawHeaders || rawHeaders.length === 0) throw new Error("CSV is empty or header row is missing.");
        headers = (rawHeaders[0] as string[]).map(h => h.trim().toLowerCase());

        // Check for phone number header (considering mapping)
        const phoneHeader = headers.find(h =>
            h === EXPECTED_PHONE_HEADER || (columnMapping && columnMapping[h] === EXPECTED_PHONE_HEADER)
        );
        if (!phoneHeader) {
            throw new Error(`Required header '${EXPECTED_PHONE_HEADER}' not found or mapped.`);
        }

        parsedData = result.map((row, index): CsvRow => {
            const rowData: CsvRow = { phone_number: '' };
            headers.forEach((header, i) => {
                const csvValue = (row[i] as string)?.trim() || '';
                const targetKey = columnMapping?.[header] || header;

                if (targetKey === EXPECTED_PHONE_HEADER) {
                    rowData.phone_number = csvValue;
                } else if (targetKey === OPTIONAL_NAME_HEADER) {
                    rowData.name = csvValue || undefined; // Store empty string as undefined for name
                } else {
                    rowData[header] = csvValue || undefined; // Store other columns
                }
            });
            if (!rowData.phone_number) {
                throw new Error(`Missing phone number in CSV row ${index + 2}`);
            }
            return rowData;
        });

    } catch (parseError) {
        console.error("CSV parsing error:", parseError);
        throw new Error(`CSV Parsing Error: ${parseError.message}`);
    }

    if (parsedData.length === 0) {
        throw new Error("No data rows found in CSV.");
    }
    return parsedData;
}

/**
 * Finds existing customer records based on phone numbers.
 *
 * @param supabase Supabase client instance.
 * @param phoneNumbers Array of phone numbers to check.
 * @returns A Map where keys are phone numbers and values are existing customer IDs.
 * @throws Error on database query failure.
 */
export async function findExistingContactsDb(
    supabase: SupabaseClient<Database>,
    phoneNumbers: string[]
): Promise<Map<string, string>> {
    if (phoneNumbers.length === 0) return new Map();

    const { data: existingContacts, error: fetchError } = await supabase
        .from("customers")
        .select("id, phone_number")
        .in("phone_number", phoneNumbers);

    if (fetchError) {
        console.error("Error fetching existing contacts:", fetchError);
        throw new Error("Failed to check for existing contacts");
    }

    return new Map(existingContacts?.map(c => [c.phone_number, c.id]) || []);
}

/**
 * Categorizes CSV rows into new contacts and duplicates based on existing contacts.
 *
 * @param parsedData Array of parsed CsvRow objects.
 * @param existingPhoneMap Map of existing phone numbers to customer IDs.
 * @returns Object containing arrays of newContactsData and duplicates info.
 */
export function categorizeCsvRows(
    parsedData: CsvRow[],
    existingPhoneMap: Map<string, string>
): { newContactsData: CustomerInsert[]; duplicates: DuplicateInfo[] } {
    const duplicates: DuplicateInfo[] = [];
    const newContactsData: CustomerInsert[] = [];

    parsedData.forEach((row, index) => {
        const existingId = existingPhoneMap.get(row.phone_number);
        if (existingId) {
            duplicates.push({ csvRowIndex: index + 2, csvData: row, existingContactId: existingId });
        } else {
            newContactsData.push({
                phone_number: row.phone_number,
                name: row.name || `Imported ${row.phone_number}`, // Default name
                // user_id: userId, // Add if needed and available
            });
        }
    });
    return { newContactsData, duplicates };
}

/**
 * Inserts new customer records into the database.
 *
 * @param supabase Supabase client instance.
 * @param contactsToInsert Array of CustomerInsert objects.
 * @returns Array of IDs of the newly inserted customers.
 * @throws Error on database insert failure.
 */
export async function insertNewContactsDb(
    supabase: SupabaseClient<Database>,
    contactsToInsert: CustomerInsert[]
): Promise<string[]> {
    if (contactsToInsert.length === 0) return [];

    const { data: insertedData, error: insertError } = await supabase
        .from("customers")
        .insert(contactsToInsert)
        .select("id");

    if (insertError) {
        console.error("Error inserting new contacts:", insertError);
        throw new Error("Failed to insert new contacts");
    }
    return (insertedData || []).map(c => c.id);
}

/**
 * Adds contact IDs to a specified segment using upsert to ignore duplicates.
 *
 * @param supabase Supabase client instance.
 * @param segmentId The ID of the target segment.
 * @param contactIds Array of contact IDs to add.
 * @returns PostgrestError if the operation fails, otherwise null.
 */
export async function linkContactsToSegmentDb(
    supabase: SupabaseClient<Database>,
    segmentId: string,
    contactIds: string[]
): Promise<PostgrestError | null> {
    if (contactIds.length === 0) return null;

    const segmentInserts: SegmentContactInsert[] = contactIds.map(contact_id => ({
        segment_id: segmentId,
        contact_id: contact_id,
    }));

    const { error } = await supabase
        .from("segment_contacts")
        .upsert(segmentInserts, { onConflict: 'segment_id, contact_id', ignoreDuplicates: true });

    if (error) {
        console.error("Error adding contacts to segment:", error);
        // Let the main handler deal with specific error codes (e.g., 404 for segment not found)
    }
    return error;
}
