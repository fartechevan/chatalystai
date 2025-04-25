
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseAndValidateRequest, addNewCustomersDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    // This now includes checking the structure and validating phone_number presence
    const contactsToInsert = await parseAndValidateRequest(req);

    // 2. Create Authenticated Supabase Client & Verify User
    // Ensure user is authenticated (RLS might depend on this)
    await getAuthenticatedUser(req);
    const supabaseClient = createSupabaseClient(req);

    // 3. Add New Customers via DB function
    const { data: insertedData, error: insertError } = await addNewCustomersDb(
      supabaseClient,
      contactsToInsert
    );

    // 4. Handle Response
    if (insertError) {
      console.error("Error inserting new customers:", insertError);
      let status = 500;
      let message = "Failed to insert new customers";
      // Handle potential unique constraint violation
      if (insertError.code === '23505') { // Unique violation code
        status = 409; // Conflict
        message = "One or more phone numbers already exist.";
      }
      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const addedCount = insertedData?.length || 0;
    const newCustomerIds = insertedData?.map(c => c.id) || [];

    // Return success result
    return new Response(JSON.stringify({
      message: `${addedCount} new customers added successfully.`,
      addedCount: addedCount,
      newCustomerIds: newCustomerIds,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Or 201 if preferred for creation
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error("Error in add-new-customers handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Invalid JSON body") status = 400;
    if (err.message === "Missing or invalid 'newContacts' array in request body") status = 400;
    if (err.message.startsWith("Invalid contact data")) status = 400; // Specific validation error
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
