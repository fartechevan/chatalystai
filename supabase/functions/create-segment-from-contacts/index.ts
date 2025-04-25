
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseServiceRoleClient } from "../_shared/supabaseClient.ts"; // Using Service Role
import {
  parseAndValidateRequest,
  createSegmentDb,
  addContactsToSegmentDb,
} from "./utils.ts";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { segmentName, customerIds, userId } = await parseAndValidateRequest(req);

    // 2. Create Supabase Service Role Client
    // Using Service Role as per original function and the need to pass userId
    const supabaseAdmin = createSupabaseServiceRoleClient();

    // --- Database Operations (Non-Atomic) ---
    // 3. Create the segment
    const { data: newSegment, error: segmentError } = await createSegmentDb(
      supabaseAdmin,
      segmentName,
      userId
    );

    if (segmentError) {
      console.error("Error creating segment:", segmentError);
      let status = 500;
      let message = `Failed to create segment: ${segmentError.message}`;
      if (segmentError.code === '23505') { // Unique violation
        status = 409; // Conflict
        message = `Segment name "${segmentName}" already exists.`;
      }
      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newSegment) {
      // Should not happen if error is null, but good practice to check
      throw new Error("Segment creation did not return data despite no error.");
    }
    console.log(`Segment created with ID: ${newSegment.id}`);

    // 4. Add contacts to the new segment
    const { error: contactsError } = await addContactsToSegmentDb(
      supabaseAdmin,
      newSegment.id,
      customerIds
    );

    if (contactsError) {
      console.error("Error adding contacts to segment:", contactsError);
      // Note: Segment was already created. This indicates partial failure.
      // For simplicity, return error but don't attempt rollback here.
      return new Response(JSON.stringify({
         error: `Segment created, but failed to add contacts: ${contactsError.message}`,
         segment: newSegment // Optionally return the created segment info
        }), {
        status: 500, // Internal Server Error (or a custom code for partial success)
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`${customerIds.length} contacts added to segment ${newSegment.id}`);

    // --- Return Success Response ---
    // Return the newly created segment data
    return new Response(JSON.stringify(newSegment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    // Catch errors from parsing or unexpected issues
    console.error("Error in create-segment-from-contacts handler:", error.message);
    let status = 500;
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message === 'Segment name is required and must be a non-empty string.') status = 400;
    if (error.message === 'Customer IDs must be provided as a non-empty array.') status = 400;
    if (error.message === 'User ID is required.') status = 400;
    if (error.message.includes("already exists")) status = 409; // From re-thrown unique constraint error

    return new Response(JSON.stringify({ error: error.message }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
