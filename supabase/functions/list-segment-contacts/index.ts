
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseRequest, listSegmentContactsDb, formatResponsePayload } from "./utils.ts";

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

    // 3. List Segment Contacts via DB function
    const { data: rawData, error } = await listSegmentContactsDb(supabaseClient, segmentId);

    // 4. Handle Response
    if (error) {
      console.error("Supabase select error:", error);
      let status = 500;
      let message = error.message || "Failed to list segment contacts";
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

    // 5. Format the response payload
    const contacts = formatResponsePayload(rawData);

    // Return the list of contacts
    return new Response(JSON.stringify(contacts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error("Error in list-segment-contacts handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Segment ID query parameter (segment_id) is required") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
