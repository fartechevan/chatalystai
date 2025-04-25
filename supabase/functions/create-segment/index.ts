
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseRequest, createSegmentDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { name } = await parseRequest(req);

    // 2. Create Authenticated Supabase Client & Get User
    const user = await getAuthenticatedUser(req); // Throws on error/unauthenticated
    const supabaseClient = createSupabaseClient(req);

    // 3. Create Segment via DB function
    const { data, error } = await createSegmentDb(
      supabaseClient,
      name,
      user.id // Pass authenticated user's ID
    );

    // 4. Handle Response
    if (error) {
      console.error("Supabase insert error:", error);
      // Consider checking for unique constraint violation (e.g., error.code === '23505')
      // if segment names must be unique per user.
      return new Response(JSON.stringify({ error: error.message || "Failed to create segment" }), {
        status: 500, // Or 409 for unique constraint violation
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the newly created segment
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, // Created
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error("Error in create-segment handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Invalid JSON body") status = 400;
    if (err.message === "Segment name is required") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
