
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Updated import path
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { parseAndValidateRequest, createSegmentDb, addContactsToSegmentDb } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Parse and validate the request body
    const { segmentName, customerIds, userId } = await parseAndValidateRequest(req);
    
    // Authenticate and create Supabase client
    await getAuthenticatedUser(req); // Ensure auth even though we check explicitly for userId
    const supabaseClient = createSupabaseClient(req);
    
    // Create the segment
    const { data: segmentData, error: segmentError } = await createSegmentDb(
      supabaseClient, 
      segmentName,
      userId
    );
    
    if (segmentError || !segmentData) {
      console.error("Error creating segment:", segmentError);
      return new Response(
        JSON.stringify({ 
          error: segmentError?.message || "Failed to create segment" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Add contacts to the segment
    const { error: addError } = await addContactsToSegmentDb(
      supabaseClient,
      segmentData.id,
      customerIds
    );
    
    if (addError) {
      console.error("Error adding contacts to segment:", addError);
      return new Response(
        JSON.stringify({ 
          error: "Segment created but failed to add some contacts: " + addError.message,
          segmentId: segmentData.id // Return the segment ID anyway since it was created
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Success response
    return new Response(
      JSON.stringify(segmentData), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Error in create-segment-from-contacts:", error.message);
    const status = 
      error.message.includes("not allowed") ? 405 : 
      error.message.includes("Invalid") || error.message.includes("required") ? 400 : 
      error.message.includes("authenticated") ? 401 : 
      500;
    
    return new Response(
      JSON.stringify({ error: error.message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
