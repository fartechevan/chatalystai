
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { validateRequest, listSegmentsDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate Request Method
    validateRequest(req); // Throws on error

    // 2. Create Authenticated Supabase Client & Get User
    const user = await getAuthenticatedUser(req); // Throws on error/unauthenticated
    const supabaseClient = createSupabaseClient(req);

    // 3. List Segments via DB function
    const { data, error } = await listSegmentsDb(supabaseClient, user.id);

    // 4. Handle Response
    if (error) {
      console.error("Supabase select error:", error);
      return new Response(JSON.stringify({ error: error.message || "Failed to list segments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the list of segments (or empty array)
    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    // Catch errors from validation, auth, or unexpected issues
    console.error("Error in list-segments handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
