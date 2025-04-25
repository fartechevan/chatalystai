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

    // Extract segment_id from the URL path parameters
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const segmentId = pathParts[pathParts.length - 1]; // Assuming ID is the last part

    if (!segmentId) {
      return new Response(JSON.stringify({ error: "Segment ID is required in the URL path" }), {
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

    // Delete the segment (RLS policy ensures user can only delete their own)
    // Note: The related segment_contacts will be deleted automatically due to ON DELETE CASCADE
    const { error } = await supabaseClient
      .from("segments")
      .delete()
      .eq("id", segmentId);
      // RLS implicitly adds .eq("user_id", user.id)

    if (error) {
      console.error("Supabase delete error:", error);
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
