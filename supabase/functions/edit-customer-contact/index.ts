/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'std/http/server.ts'; // Use import map alias
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getAuthenticatedUser } from '../_shared/supabaseClient.ts';
import { parseAndValidateRequest, prepareUpdatePayload, updateCustomerDb } from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse and Validate Request
    const updates = await parseAndValidateRequest(req);
    const customerId = updates.id; // Extract ID for clarity

    // 2. Create Authenticated Supabase Client & Get User
    const user = await getAuthenticatedUser(req); // Throws on error/unauthenticated
    const supabaseClient = createSupabaseClient(req);

    // 3. Prepare Update Payload
    const updateData = prepareUpdatePayload(updates);

    // 4. Update Customer via DB function
    const { data, error } = await updateCustomerDb(
      supabaseClient,
      customerId,
      user.id,
      updateData
    );

    // 5. Handle Response
    if (error) {
      console.error('Error updating customer:', error);
      let status = 500;
      let message = typeof error === 'object' && error !== null && 'message' in error
                      ? error.message
                      : 'Failed to update contact';

      // Check for specific error code/message from the DB util
      if (typeof error === 'object' && error !== null && 'message' in error && error.message.includes("Contact not found")) {
        status = 404;
        message = "Contact not found or user does not have permission to edit";
      } else if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116') {
         // Handle potential PostgrestError specifically if needed, though the custom error above covers it
         status = 404;
         message = "Contact not found or user does not have permission to edit";
      }

      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the updated customer data
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (err) {
    // Catch errors from parsing, auth, or unexpected issues
    console.error('Error in edit-customer-contact handler:', err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    if (err.message === "Invalid JSON body") status = 400;
    if (err.message === "Contact ID (id) is required") status = 400;
    if (err.message === "At least one field (name, email, phone, company) must be provided for update") status = 400;
    if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
