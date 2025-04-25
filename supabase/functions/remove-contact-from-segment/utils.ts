/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../_shared/database.types.ts";

/**
 * Parses and validates the incoming request for removing a contact from a segment.
 * Checks for DELETE method and required query parameters.
 *
 * @param req The incoming request object.
 * @returns The validated segmentId and contactId.
 * @throws Error if validation fails.
 */
export function parseRequest(req: Request): { segmentId: string; contactId: string } {
  if (req.method !== "DELETE") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  const url = new URL(req.url);
  const segmentId = url.searchParams.get("segment_id");
  const contactId = url.searchParams.get("contact_id");

  if (!segmentId || !contactId) {
    throw new Error("Segment ID (segment_id) and Contact ID (contact_id) query parameters are required"); // Caught for 400
  }

  // Optional: Add validation for ID formats (e.g., UUID)

  return { segmentId, contactId };
}

/**
 * Removes a contact from a segment in the database.
 * Relies on RLS policies for authorization.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param segmentId The ID of the segment.
 * @param contactId The ID of the contact to remove.
 * @returns The result of the delete operation { error }.
 */
export async function removeContactFromSegmentDb(
  supabase: SupabaseClient<Database>,
  segmentId: string,
  contactId: string
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("segment_contacts")
    .delete()
    .eq("segment_id", segmentId)
    .eq("contact_id", contactId);
    // RLS implicitly checks if the user owns the segment via the segment_id

  if (error) {
    console.error(`Error removing contact ${contactId} from segment ${segmentId}:`, error);
    // Specific error handling (like PGRST116) done in handler
  }

  return { error };
}
