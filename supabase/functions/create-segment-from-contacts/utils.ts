/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../_shared/database.types.ts";

type SegmentResponse = Database["public"]["Tables"]["segments"]["Row"];
type SegmentContact = Database['public']['Tables']['segment_contacts']['Row'];

interface CreateSegmentFromContactsRequest {
  segmentName: string;
  customerIds: string[];
  userId: string; // Required when using Service Role client
}

/**
 * Parses and validates the incoming request for creating a segment from contacts.
 * Checks for POST method and required fields in the body.
 *
 * @param req The incoming request object.
 * @returns The validated request parameters.
 * @throws Error if validation fails.
 */
export async function parseAndValidateRequest(req: Request): Promise<CreateSegmentFromContactsRequest> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<CreateSegmentFromContactsRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { segmentName, customerIds, userId } = body;

  if (!segmentName || typeof segmentName !== 'string' || segmentName.trim() === '') {
    throw new Error('Segment name is required and must be a non-empty string.'); // Caught for 400
  }
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    throw new Error('Customer IDs must be provided as a non-empty array.'); // Caught for 400
  }
  if (!userId || typeof userId !== 'string') { // Validate userId presence
    throw new Error('User ID is required.'); // Caught for 400
  }
  // Optional: Add validation for customerIds format (e.g., UUID)

  return { segmentName: segmentName.trim(), customerIds, userId };
}

// Note: The RPC approach (`createSegmentWithContactsDbRpc`) was removed as the
// corresponding database function 'create_segment_and_add_contacts' is not defined
// in the provided database types. Using sequential, non-atomic operations instead.

/**
 * Creates a new segment record.
 */
export async function createSegmentDb(
  supabase: SupabaseClient<Database>,
  name: string,
  userId: string
): Promise<{ data: SegmentResponse | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('segments')
    .insert({ name: name, user_id: userId })
    .select()
    .single();
  return { data, error };
}

/**
 * Adds contacts to a segment (Non-atomic alternative).
 */
export async function addContactsToSegmentDb(
  supabase: SupabaseClient<Database>,
  segmentId: string,
  contactIds: string[]
): Promise<{ error: PostgrestError | null }> {
   if (contactIds.length === 0) return { error: null };

   const segmentContactsData: Omit<SegmentContact, 'id' | 'added_at'>[] = contactIds.map(contactId => ({
     segment_id: segmentId,
     contact_id: contactId, // Assuming schema uses contact_id
   }));

   const { error } = await supabase
     .from('segment_contacts')
     .insert(segmentContactsData); // Consider upsert if needed

   return { error };
}
