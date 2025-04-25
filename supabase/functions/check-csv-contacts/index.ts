import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Database } from "../_shared/database.types.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON body
    const { phoneNumbers } = await req.json() as { phoneNumbers?: string[] };

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'phoneNumbers' array in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with auth context
    const supabaseClient = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
        auth: { persistSession: false },
      }
    );

    // Get the authenticated user (optional, but good practice)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Check Existing Customers ---
    const { data: existingCustomers, error: fetchError } = await supabaseClient
      .from("customers")
      .select("id, phone_number")
      .in("phone_number", phoneNumbers);

    if (fetchError) {
      console.error("Error fetching existing customers:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to check for existing customers" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const existingPhoneSet = new Set(existingCustomers?.map(c => c.phone_number) || []);
    const existingCustomerIds = existingCustomers?.map(c => c.id) || [];
    const newPhoneNumbers = phoneNumbers.filter(num => !existingPhoneSet.has(num));

    // --- Return Result ---
    return new Response(JSON.stringify({
      existingCustomerIds: existingCustomerIds,
      newPhoneNumbers: newPhoneNumbers,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Internal server error:", err);
    return new Response(JSON.stringify({ error: err.message || "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
