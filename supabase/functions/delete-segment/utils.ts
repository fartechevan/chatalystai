
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

/**
 * Parses and validates the incoming request for deleting a segment.
 * Checks for DELETE method and extracts segmentId from the URL path.
 *
 * @param req The incoming request object.
 * @returns The validated segmentId.
 * @throws Error if validation fails (wrong method, missing ID).
 */
export function parseRequest(req: Request): { segmentId: string } {
  if (req.method !== "DELETE") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // Assuming the ID is the last part of the path, e.g., /functions/v1/delete-segment/uuid-goes-here
  const segmentId = pathParts[pathParts.length - 1];

  if (!segmentId) {
    throw new Error("Segment ID is required in the URL path"); // Caught for 400
  }

  // Optional: Add validation for segmentId format (e.g., UUID)

  return { segmentId };
}

/**
 * Deletes a segment record from the database.
 * Relies on RLS policies to ensure the user owns the segment.
 * Assumes ON DELETE CASCADE is set for related segment_contacts.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param segmentId The ID of the segment to delete.
 * @returns The result of the delete operation { error }.
 */
export async function deleteSegmentDb(
  supabase: SupabaseClient<Database>,
  segmentId: string
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("segments")
    .delete()
    .eq("id", segmentId);
    // RLS policy implicitly adds .eq("user_id", user.id)

  if (error) {
    console.error(`Error deleting segment ${segmentId}:`, error);
    // Specific error handling (like PGRST116) should be done in the main handler
  }

  return { error };
}
