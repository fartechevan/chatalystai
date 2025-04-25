
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

// Define the structure of the customer data we want to return
type CustomerInfo = Pick<Database["public"]["Tables"]["customers"]["Row"], "id" | "name" | "phone_number" | "email">;

// Define the structure returned by the database query
interface SegmentContactWithCustomer {
  segment_id: string;
  added_at: string;
  customers: CustomerInfo | null; // Joined customer data
}

/**
 * Parses and validates the incoming request for listing segment contacts.
 * Checks for GET method and required 'segment_id' query parameter.
 *
 * @param req The incoming request object.
 * @returns The validated segmentId.
 * @throws Error if validation fails.
 */
export function parseRequest(req: Request): { segmentId: string } {
  if (req.method !== "GET") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  const url = new URL(req.url);
  const segmentId = url.searchParams.get("segment_id");

  if (!segmentId) {
    throw new Error("Segment ID query parameter (segment_id) is required"); // Caught for 400
  }

  return { segmentId };
}

/**
 * Fetches contacts belonging to a specific segment from the database.
 * Relies on RLS policies for authorization.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param segmentId The ID of the segment.
 * @returns The result of the query { data, error }. Data contains joined customer info.
 */
export async function listSegmentContactsDb(
  supabase: SupabaseClient<Database>,
  segmentId: string
): Promise<{ data: SegmentContactWithCustomer[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("segment_contacts")
    .select(`
      segment_id,
      added_at,
      customers ( id, name, phone_number, email )
    `)
    .eq("segment_id", segmentId);
    // RLS on segment_contacts checks ownership via segment_id -> segments.user_id

  if (error) {
    console.error(`Error fetching contacts for segment ${segmentId}:`, error);
    // Specific error handling (like PGRST116) done in handler
  }

  return { data, error };
}

/**
 * Formats the raw database query result into an array of customer objects.
 *
 * @param rawData The raw data array from the listSegmentContactsDb query.
 * @returns An array of CustomerInfo objects, or an empty array if input is null/empty.
 */
export function formatResponsePayload(rawData: SegmentContactWithCustomer[] | null): CustomerInfo[] {
  if (!rawData) {
    return [];
  }
  // Filter out entries where the customer join might have failed (customers is null)
  // and map to return only the customer object.
  return rawData
         .map(item => item.customers)
         .filter((customer): customer is CustomerInfo => customer !== null);
}
