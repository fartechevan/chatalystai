
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseRequest, findExistingCustomersDb, categorizePhoneNumbers } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const phoneNumbers = await parseRequest(req);

    // 2. Create Authenticated Supabase Client & Verify User
    await getAuthenticatedUser(req); // Ensures user is authenticated
    const supabaseClient = createSupabaseClient(req);

    // 3. Find Existing Customers via DB function
    const { data: existingCustomers, error: fetchError } = await findExistingCustomersDb(
      supabaseClient,
      phoneNumbers
    );

    if (fetchError) {
      console.error("Error fetching existing customers:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to check for existing customers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Categorize Phone Numbers
    const { existingCustomerIds, newPhoneNumbers } = categorizePhoneNumbers(
      phoneNumbers,
      existingCustomers
    );

    // 5. Return Result
    return new Response(JSON.stringify({
      existingCustomerIds: existingCustomerIds,
      newPhoneNumbers: newPhoneNumbers,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error("Error in check-csv-contacts handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Invalid JSON body") status = 400;
    if (err.message === "Missing or invalid 'phoneNumbers' array in request body") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
