/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "std/http/server.ts"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseRequest, removeContactFromSegmentDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { segmentId, contactId } = parseRequest(req); // No await needed

    // 2. Create Authenticated Supabase Client & Verify User
    await getAuthenticatedUser(req); // Ensures user is authenticated
    const supabaseClient = createSupabaseClient(req);

    // 3. Remove Contact from Segment via DB function
    const { error } = await removeContactFromSegmentDb(supabaseClient, segmentId, contactId);

    // 4. Handle Response
    if (error) {
      console.error("Supabase delete error:", error);
      let status = 500;
      let message = error.message || "Failed to remove contact from segment";
      // Check if the error is due to RLS violation or record not found
      if (error.code === 'PGRST116') { // PostgREST error code for RLS violation or 0 rows affected
        status = 404; // Not Found or Forbidden
        message = "Contact not found in segment or access denied";
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
    console.error("Error in remove-contact-from-segment handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Segment ID (segment_id) and Contact ID (contact_id) query parameters are required") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
