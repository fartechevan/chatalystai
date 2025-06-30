import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";

interface CheckBlastLimitRequest {
  recipient_count: number;
  check_only?: boolean; // If true, don't update the count (just check)
}

interface BlastLimitResponse {
  allowed: boolean;
  current_count: number;
  limit: number;
  remaining: number;
  error_message?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient(req);
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Parse request body
    const requestBody: CheckBlastLimitRequest = await req.json();
    const { recipient_count, check_only = false } = requestBody;

    if (!recipient_count || recipient_count <= 0) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "recipient_count must be a positive number" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's an existing record for today
    const { data: existingLimit, error: fetchError } = await supabaseClient
      .from('whatsapp_blast_limits')
      .select('*')
      .eq('date', today)
      .single();

    // Default blast limit
    const BLAST_LIMIT = 150;
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error("Error fetching blast limit:", fetchError);
      return new Response(
        JSON.stringify({ error: "Database Error", message: "Failed to check blast limit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let currentCount = 0;
    let limitId: string | null = null;

    if (existingLimit) {
      // Record exists for today
      currentCount = existingLimit.count;
      limitId = existingLimit.id;
    }

    // Check if adding the new recipients would exceed the limit
    if (currentCount + recipient_count > BLAST_LIMIT) {
      return new Response(
        JSON.stringify({
          allowed: false,
          current_count: currentCount,
          limit: BLAST_LIMIT,
          remaining: BLAST_LIMIT - currentCount,
          error_message: `Daily blast limit of ${BLAST_LIMIT} would be exceeded. You have sent ${currentCount} messages today and can send ${BLAST_LIMIT - currentCount} more.`
        } as BlastLimitResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If check_only is true, just return the current status without updating
    if (check_only) {
      return new Response(
        JSON.stringify({
          allowed: currentCount + recipient_count <= BLAST_LIMIT,
          current_count: currentCount,
          limit: BLAST_LIMIT,
          remaining: BLAST_LIMIT - currentCount
        } as BlastLimitResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // If no record exists for today, create one
    if (!existingLimit) {
      const { data: newLimit, error: insertError } = await supabaseClient
        .from('whatsapp_blast_limits')
        .insert({
          date: today,
          blast_limit: BLAST_LIMIT,
          count: recipient_count
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating blast limit record:", insertError);
        return new Response(
          JSON.stringify({ error: "Database Error", message: "Failed to create blast limit record" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          current_count: recipient_count,
          limit: BLAST_LIMIT,
          remaining: BLAST_LIMIT - recipient_count
        } as BlastLimitResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      // Update the existing record
      const newCount = currentCount + recipient_count;
      const { error: updateError } = await supabaseClient
        .from('whatsapp_blast_limits')
        .update({ count: newCount })
        .eq('id', limitId);

      if (updateError) {
        console.error("Error updating blast limit record:", updateError);
        return new Response(
          JSON.stringify({ error: "Database Error", message: "Failed to update blast limit record" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          current_count: newCount,
          limit: BLAST_LIMIT,
          remaining: BLAST_LIMIT - newCount
        } as BlastLimitResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in check-whatsapp-blast-limit:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: (error as Error).message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
