
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseRequest, deleteSegmentDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { segmentId } = parseRequest(req); // No await needed for sync function

    // 2. Create Authenticated Supabase Client & Verify User
    await getAuthenticatedUser(req); // Ensures user is authenticated
    const supabaseClient = createSupabaseClient(req);

    // 3. Delete Segment via DB function
    const { error } = await deleteSegmentDb(supabaseClient, segmentId);

    // 4. Handle Response
    if (error) {
      console.error("Supabase delete error:", error);
      let status = 500;
      let message = error.message || "Failed to delete segment";
      // Check if the error is due to RLS violation (segment not found or not owned)
      if (error.code === 'PGRST116') { // PostgREST error code for RLS violation or 0 rows affected
        status = 404; // Not Found or Forbidden
        message = "Segment not found or access denied";
      }
      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return success response (No Content)
    return new Response(null, {
      headers: { ...corsHeaders },
      status: 204, // No Content
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error("Error in delete-segment handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Segment ID is required in the URL path") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
