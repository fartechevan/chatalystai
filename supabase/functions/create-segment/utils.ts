
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

type SegmentInsert = Database["public"]["Tables"]["segments"]["Insert"];
type SegmentResponse = Database["public"]["Tables"]["segments"]["Row"];

interface CreateSegmentRequest {
  name: string;
}

/**
 * Parses and validates the incoming request for creating a segment.
 * Checks for POST method and a non-empty 'name' in the body.
 *
 * @param req The incoming request object.
 * @returns The validated segment name.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<{ name: string }> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<CreateSegmentRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { name } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Segment name is required"); // Caught for 400
  }

  return { name: name.trim() };
}

/**
 * Creates a new segment record in the database.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param name The name for the new segment.
 * @param userId The ID of the user creating the segment.
 * @returns The result of the insert operation { data, error }.
 */
export async function createSegmentDb(
  supabase: SupabaseClient<Database>,
  name: string,
  userId: string
): Promise<{ data: SegmentResponse | null; error: PostgrestError | null }> {
  const segmentData: SegmentInsert = {
    name: name,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("segments")
    .insert(segmentData)
    .select()
    .single(); // Return the created segment

  if (error) {
    console.error("Error inserting segment in createSegmentDb:", error);
    // Specific error handling (like unique constraint) can be done here or in the handler
  }

  return { data, error };
}
