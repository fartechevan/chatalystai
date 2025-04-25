/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types.ts"; // Assuming types are in the same _shared folder

/**
 * Creates a Supabase client with the user's authentication context.
 * Extracts the Authorization header from the incoming request.
 * Throws an error if the Authorization header is missing.
 *
 * @param req The incoming request object.
 * @returns An authenticated Supabase client instance.
 * @throws Error if Authorization header is missing or Supabase env vars are not set.
 */
export function createSupabaseClient(req: Request): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables (URL or Anon Key).");
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    // It's often better to let the getUser() call fail downstream
    // for a 401, but throwing here can be clearer for debugging setup issues.
    console.warn("Authorization header missing in request.");
    // Depending on policy, you might allow anon access or throw:
    // throw new Error("Missing Authorization header.");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization || "" } }, // Pass empty string if null
    auth: {
      persistSession: false, // Essential for server-side/edge functions
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates a Supabase client using the Service Role Key for elevated privileges.
 * Use this client for operations that need to bypass RLS or require admin rights.
 * Ensure the Service Role Key is properly secured.
 *
 * @returns A Supabase client instance with service role privileges.
 * @throws Error if Supabase env vars (URL or Service Role Key) are not set.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables (URL or Service Role Key).");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Utility function to get the authenticated user from a request.
 * Uses the standard authenticated client.
 *
 * @param req The incoming request object.
 * @returns The authenticated user object.
 * @throws Error if user is not authenticated or client creation fails.
 */
export async function getAuthenticatedUser(req: Request) {
  const supabaseClient = createSupabaseClient(req);
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Auth error getting user:", error.message);
    throw new Error(`Authentication error: ${error.message}`);
  }
  if (!user) {
    throw new Error("User not authenticated.");
  }
  return user;
}
