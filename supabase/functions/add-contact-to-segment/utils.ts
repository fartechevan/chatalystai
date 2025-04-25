
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

type SegmentContactInsert = Database["public"]["Tables"]["segment_contacts"]["Insert"];
type SegmentContactResponse = Database["public"]["Tables"]["segment_contacts"]["Row"];

interface AddContactRequest {
  segment_id: string;
  contact_id: string;
}

/**
 * Parses and validates the incoming request for adding a contact to a segment.
 * Checks for POST method and required segment_id/contact_id in the body.
 *
 * @param req The incoming request object.
 * @returns The validated segment_id and contact_id.
 * @throws Error if validation fails (e.g., wrong method, missing fields).
 */
export async function parseAndValidateRequest(req: Request): Promise<AddContactRequest> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler to return 405
  }

  let body: Partial<AddContactRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler to return 400
  }

  const { segment_id, contact_id } = body;

  if (!segment_id || !contact_id) {
    throw new Error("Segment ID and Contact ID are required"); // Caught by handler to return 400
  }

  // Optional: Add further validation (e.g., check if IDs are valid UUIDs)

  return { segment_id, contact_id };
}

/**
 * Adds a contact to a segment in the database using upsert.
 * Handles potential foreign key violations and other DB errors.
 * Relies on RLS policies for authorization.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param segmentId The ID of the segment.
 * @param contactId The ID of the contact.
 * @returns The result of the upsert operation { data, error, status }.
 */
export async function addContactToSegmentDb(
  supabase: SupabaseClient<Database>,
  segmentId: string,
  contactId: string
): Promise<{ data: SegmentContactResponse | null; error: PostgrestError | { message: string } | null; status: number }> {
  const insertData: SegmentContactInsert = {
    segment_id: segmentId,
    contact_id: contactId,
  };

  // Use upsert with ignoreDuplicates=true to handle potential race conditions or re-adds gracefully
  const { data, error, status, count } = await supabase
    .from("segment_contacts")
    .upsert(insertData, { onConflict: 'segment_id, contact_id', ignoreDuplicates: true })
    .select()
    .maybeSingle(); // Use maybeSingle to handle both insert and existing cases

  if (error) {
    console.error("Supabase upsert error in addContactToSegmentDb:", error);
    // Check for specific errors
    if (error.code === '23503') { // Foreign key violation
      return { data: null, error: { message: "Segment or Contact not found" }, status: 404 };
    }
    // RLS errors might manifest as 404 or other codes depending on policy
    // Return a generic server error for other issues
    return { data: null, error: { message: error.message || "Database error" }, status: 500 };
  }

  // Determine status code: 201 if a row was inserted/upserted, 200 if it already existed (count is 0 due to ignoreDuplicates)
  // Note: `count` might be unreliable with `ignoreDuplicates`. A safer check might be needed if precise 200 vs 201 is critical.
  // For simplicity, we can check if `data` exists. If upsert found a conflict and ignored, `data` will be the existing row.
  // If it inserted, `data` will be the new row.
  const finalStatus = data ? 200 : 204; // 200 OK if record exists/was added, 204 No Content might be better if nothing changed? Let's stick to 200/201 logic based on data presence.
  // Let's refine: If data exists, it was either inserted or already there. Use 200 for simplicity unless a new row was definitely created.
  // The original code used 201 if data existed, which seems reasonable for "resource ensured".

  return { data, error: null, status: data ? 201 : 200 }; // Return 201 if data is present (created or existing), 200 might be confusing here. Let's stick to 201.
}
