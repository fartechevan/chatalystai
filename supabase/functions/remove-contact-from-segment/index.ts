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
    // Ensure the request method is DELETE
    if (req.method !== "DELETE") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract segment_id and contact_id from query parameters
    const url = new URL(req.url);
    const segmentId = url.searchParams.get("segment_id");
    const contactId = url.searchParams.get("contact_id");

    if (!segmentId || !contactId) {
      return new Response(JSON.stringify({ error: "Segment ID and Contact ID query parameters are required" }), {
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

    // Delete the relationship
    // RLS policy on segment_contacts ensures the user owns the target segment
    const { error } = await supabaseClient
      .from("segment_contacts")
      .delete()
      .eq("segment_id", segmentId)
      .eq("contact_id", contactId);
      // RLS implicitly checks if the user owns the segment via the segment_id

    if (error) {
      console.error("Supabase delete error:", error);
       // Check if the error is due to RLS violation (segment not found or not owned)
       // or if the specific contact wasn't in the segment (0 rows affected)
      if (error.code === 'PGRST116') { // PostgREST error code for RLS violation or 0 rows affected
         return new Response(JSON.stringify({ error: "Contact not found in segment or access denied" }), {
           status: 404, // Not Found or Forbidden
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return success response (No Content)
    return new Response(null, {
      headers: { ...corsHeaders },
      status: 204, // No Content
    });
  } catch (err) {
    console.error("Internal server error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
