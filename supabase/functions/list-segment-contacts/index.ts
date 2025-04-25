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
    // Ensure the request method is GET
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract segment_id from query parameters
    const url = new URL(req.url);
    const segmentId = url.searchParams.get("segment_id");

    if (!segmentId) {
      return new Response(JSON.stringify({ error: "Segment ID query parameter is required" }), {
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
        auth: {
          persistSession: false,
        },
      }
    );

    // Get the authenticated user (needed for RLS check)
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch contacts belonging to the specified segment owned by the user
    // RLS policies on both tables ensure data security
    const { data, error } = await supabaseClient
      .from("segment_contacts")
      .select(`
        segment_id,
        added_at,
        customers ( id, name, phone_number, email )
      `)
      .eq("segment_id", segmentId);
      // RLS on segment_contacts checks ownership via segment_id -> segments.user_id

    if (error) {
      console.error("Supabase select error:", error);
      // Check if the error is due to RLS violation (segment not found or not owned)
      if (error.code === 'PGRST116') { // PostgREST error code for RLS violation or 0 rows affected
         return new Response(JSON.stringify({ error: "Segment not found or access denied" }), {
           status: 404, // Not Found or Forbidden
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format the response to return just the customer details
    const contacts = data?.map(item => item.customers) ?? [];

    // Return the list of contacts
    return new Response(JSON.stringify(contacts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Internal server error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
