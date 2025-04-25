/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../_shared/database.types.ts";

// Define the structure of the segment data we want to return
type SegmentInfo = Pick<Database["public"]["Tables"]["segments"]["Row"], "id" | "name" | "created_at">;

/**
 * Validates the incoming request for listing segments.
 * Checks for GET method.
 *
 * @param req The incoming request object.
 * @throws Error if validation fails (wrong method).
 */
export function validateRequest(req: Request): void {
  if (req.method !== "GET") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }
}

/**
 * Fetches segments belonging to a specific user from the database.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param userId The ID of the authenticated user.
 * @returns The result of the query { data, error }.
 */
export async function listSegmentsDb(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ data: SegmentInfo[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("segments")
    .select("id, name, created_at")
    .eq("user_id", userId) // Filter by the logged-in user
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error fetching segments for user ${userId}:`, error);
    // Error handled by the main handler
  }

  return { data, error };
}
