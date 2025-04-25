
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Updated import path
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseServiceRoleClient } from '../_shared/supabaseClient.ts'; // Using Service Role
import {
  parseRequest,
  getConversationLeadIdDb,
  fetchLeadCreationPrerequisitesDb,
  createLeadRecordDb,
  linkLeadToConversationDb,
} from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const { conversationId, customerId } = await parseRequest(req);

    // 2. Create Supabase Service Role Client
    // Assuming this function needs elevated privileges based on original code
    const supabaseAdmin = createSupabaseServiceRoleClient();

    // 3. Check if Conversation Already Has Lead
    const existingLeadId = await getConversationLeadIdDb(supabaseAdmin, conversationId);
    if (existingLeadId) {
      console.log(`Conversation ${conversationId} already has lead ${existingLeadId}`);
      return new Response(JSON.stringify({ message: 'Conversation already has a lead', lead_id: existingLeadId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // 4. Fetch Prerequisites (Customer Name, Default Stage ID)
    const { customerName, defaultStageId } = await fetchLeadCreationPrerequisitesDb(supabaseAdmin, customerId);

    // Determine lead name (using customer name or a default)
    // Note: The 'leads' table doesn't have a 'name' column per database.types.ts.
    // This logic is kept if needed elsewhere, but not used for insertion.
    // const leadName = customerName || `Lead from Conversation ${conversationId.substring(0, 8)}`;

    // 5. Get User ID (Required for leads table)
    // Since we are using Service Role, we cannot get user from context easily.
    // The user ID *must* be passed in the request or determined via other means
    // if this function is intended to associate the lead with a specific user.
    // For now, assuming it might be a system process or user ID is handled differently.
    // If user association is needed, the request/logic must be adapted.
    // Let's assume for now the leads table RLS or triggers handle user_id,
    // OR that the original function's intent needs clarification on user context.
    // **Placeholder: If user_id is strictly required by DB and not handled by RLS/trigger, this will fail.**
    // **A common pattern is to require userId in the request body when using Service Role.**
    // For this refactor, I'll proceed assuming the DB handles it or it's not needed based on the schema read.
    // Re-checking leads.Insert: `user_id: string` is required.
    // This function *cannot* work correctly with Service Role without a user_id source.
    // Modifying to expect userId in the request payload as a temporary measure.

    let userIdFromBody: string | undefined;
    try {
        const body = await req.clone().json(); // Clone req to re-read body
        userIdFromBody = body.userId;
         if (!userIdFromBody) {
            throw new Error("userId is required in the request body when using service role for lead creation.");
         }
    } catch (e) {
         throw new Error("Invalid JSON body or missing userId");
    }


    // 6. Create Lead Record
    const newLeadData = await createLeadRecordDb(
      supabaseAdmin,
      customerId,
      defaultStageId,
      userIdFromBody // Pass the user ID from the request body
    );
    const newLeadId = newLeadData.id;
    console.log("New lead created:", newLeadData);

    // 7. Link Lead to Conversation
    const linkError = await linkLeadToConversationDb(supabaseAdmin, conversationId, newLeadId);
    if (linkError) {
      // Return error indicating partial success/failure
      return new Response(JSON.stringify({ error: `Lead created (${newLeadId}) but failed to link to conversation: ${linkError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal Server Error (or custom code)
      });
    }
    console.log(`Successfully linked lead ${newLeadId} to conversation ${conversationId}`);

    // 8. Return Success Response
    return new Response(JSON.stringify(newLeadData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    console.error("Error in create-lead-from-conversation handler:", error.message);
    let status = 500;
    if (error.message === "Method Not Allowed") status = 405;
    if (error.message === "Invalid JSON body or missing userId") status = 400;
    if (error.message === "Missing required parameters: conversationId and customerId") status = 400;
    if (error.message.includes("not found")) status = 404; // e.g., Customer or Stage not found
    if (error.message.includes("Could not find a default pipeline stage")) status = 404;

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});
