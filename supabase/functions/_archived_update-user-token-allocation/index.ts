import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Update User Token Allocation function booting up...");

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // For admin tasks, it's more secure to use the service role key.
    // Ensure SUPABASE_SERVICE_ROLE_KEY is set in function environment variables.
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );


    const { user_id, plan_id } = await req.json();

    if (!user_id || !plan_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or plan_id" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Fetching plan details for plan_id: ${plan_id}`);
    // 1. Fetch the token_allocation from the plans table
    const { data: planData, error: planError } = await adminSupabaseClient
      .from("plans")
      .select("token_allocation")
      .eq("id", plan_id)
      .single();

    if (planError) {
      console.error("Error fetching plan:", planError);
      throw planError;
    }
    if (!planData) {
      return new Response(
        JSON.stringify({ error: `Plan with id ${plan_id} not found.` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const monthlyTokens = planData.token_allocation;
    if (monthlyTokens === null || monthlyTokens === undefined) {
        return new Response(
            JSON.stringify({ error: `Token allocation not set for plan id ${plan_id}.` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400, // Or 404 if plan exists but no allocation
            }
          );
    }
    
    console.log(`Upserting token allocation for user_id: ${user_id} with ${monthlyTokens} tokens.`);
    // 2. Upsert into token_allocations table
    // The 'user_id' column in 'token_allocations' is the foreign key to 'profiles.id'
    // Ensure 'user_id' in 'token_allocations' has a unique constraint for onConflict to work as expected.
    // Based on types, it's a one-to-one, so user_id is effectively unique.
    const { data: allocationData, error: allocationError } = await adminSupabaseClient
      .from("token_allocations")
      .upsert(
        { user_id: user_id, monthly_tokens: monthlyTokens }, // Removed client-generated id
        { onConflict: "user_id" } // Upsert based on user_id conflict
      )
      .select(); // Return the upserted data

    if (allocationError) {
      console.error("Error upserting token allocation:", allocationError);
      // Check if the error is due to onConflict target not being a unique constraint
      if (allocationError.message.includes("constraint") && allocationError.message.includes("user_id")) {
         console.warn("Potential issue with onConflict: 'user_id' might not be a unique constraint or primary key suitable for conflict resolution. Falling back to separate insert/update or ensuring schema is correct.");
      }
      throw allocationError;
    }

    return new Response(JSON.stringify({ success: true, data: allocationData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unhandled error in function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
