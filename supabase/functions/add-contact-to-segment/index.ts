/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "std/http/server.ts"; // Use import map alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseAndValidateRequest, addContactToSegmentDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { segment_id, contact_id } = await parseAndValidateRequest(req);

    // 2. Create Authenticated Supabase Client & Verify User
    // getAuthenticatedUser throws if user is not found or auth error occurs
    await getAuthenticatedUser(req);
    const supabaseClient = createSupabaseClient(req); // Create client after ensuring user is authenticated

    // 3. Add Contact to Segment via DB function
    const { data, error, status } = await addContactToSegmentDb(
      supabaseClient,
      segment_id,
      contact_id
    );

    // 4. Handle Response
    if (error) {
      return new Response(JSON.stringify({ error: error.message || "Failed to add contact to segment" }), {
        status: status, // Use status from DB function (e.g., 404, 500)
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the created/existing relationship record
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status, // Use status from DB function (e.g., 201)
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error("Error in add-contact-to-segment handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Invalid JSON body") status = 400;
    if (err.message === "Segment ID and Contact ID are required") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
