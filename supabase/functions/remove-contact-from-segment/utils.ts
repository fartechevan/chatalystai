
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

/**
 * Parses and validates the request for removing a contact from a segment.
 * Checks for DELETE method and extracts required segmentId/contactId from URL params.
 *
 * @param req The incoming request object.
 * @returns The extracted segmentId and contactId.
 * @throws Error if validation fails (e.g., wrong method, missing params).
 */
export function parseRequest(req: Request): { segmentId: string; contactId: string } {
  if (req.method !== "DELETE") {
    throw new Error("Method Not Allowed");
  }
  
  // Get URL and parse query parameters
  const url = new URL(req.url);
  const segmentId = url.searchParams.get("segment_id");
  const contactId = url.searchParams.get("contact_id");
  
  if (!segmentId || !contactId) {
    throw new Error("Segment ID (segment_id) and Contact ID (contact_id) query parameters are required");
  }
  
  return { segmentId, contactId };
}

/**
 * Removes a contact from a segment in the database.
 * Relies on RLS policies for authorization.
 * 
 * @param supabase The Supabase client instance (authenticated).
 * @param segmentId The ID of the segment.
 * @param contactId The ID of the contact to remove.
 * @returns The result of the delete operation.
 */
export async function removeContactFromSegmentDb(
  supabase: SupabaseClient<Database>, 
  segmentId: string,
  contactId: string
): Promise<{ error: PostgrestError | null }> {
  // Delete the relationship record between the segment and contact
  const { error } = await supabase
    .from("segment_contacts")
    .delete()
    .match({ segment_id: segmentId, contact_id: contactId });
  
  return { error };
}
