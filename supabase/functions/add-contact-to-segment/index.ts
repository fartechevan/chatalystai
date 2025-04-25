import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Database } from "../_shared/database.types.ts";

type SegmentContactInsert = Database["public"]["Tables"]["segment_contacts"]["Insert"];

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

    // Parse request body
    const { segment_id, contact_id } = (await req.json()) as {
      segment_id: string;
      contact_id: string;
    };

    if (!segment_id || !contact_id) {
      return new Response(JSON.stringify({ error: "Segment ID and Contact ID are required" }), {
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

    // Prepare data for insertion
    // RLS policy on segment_contacts ensures the user owns the target segment
    const insertData: SegmentContactInsert = {
      segment_id: segment_id,
      contact_id: contact_id,
    };

    // Insert the relationship
    // Use upsert with ignoreDuplicates=true to handle potential race conditions or re-adds gracefully
    const { data, error } = await supabaseClient
      .from("segment_contacts")
      .upsert(insertData, { onConflict: 'segment_id, contact_id', ignoreDuplicates: true })
      .select()
      .single(); // Select the potentially inserted/existing row

    if (error) {
        // Check if the error is due to RLS violation on the segments table (user doesn't own segment)
        // or foreign key violation (contact_id or segment_id doesn't exist)
        if (error.code === '23503') { // Foreign key violation
             return new Response(JSON.stringify({ error: "Segment or Contact not found" }), {
               status: 404,
               headers: { ...corsHeaders, "Content-Type": "application/json" },
             });
        }
        // RLS check failure might not return a specific code easily distinguishable here,
        // but the operation would fail if the user doesn't own the segment.
        // A generic 500 or a more specific check might be needed if granular errors are required.
        console.error("Supabase insert/upsert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, // Or potentially 403/404 depending on RLS failure reason
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Return the created/existing relationship record
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: data ? 201 : 200, // 201 if created, 200 if already existed (due to upsert)
    });
  } catch (err) {
    console.error("Internal server error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
