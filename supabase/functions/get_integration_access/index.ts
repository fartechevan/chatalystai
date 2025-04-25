/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'std/http/server.ts'; // Use import map alias
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getAuthenticatedUser } from '../_shared/supabaseClient.ts';
import {
  parseRequest,
  getUserRole,
  fetchAccessDb,
  grantAccessDb,
  revokeAccessDb,
  fetchEvolutionConnectionInfoDb,
} from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Create Authenticated Client & Get User
    const user = await getAuthenticatedUser(req); // Throws on error/unauthenticated
    const supabaseClient = createSupabaseClient(req);

    // 2. Parse Request Body
    const payload = await parseRequest(req);
    const { action, integrationId, profileId, accessId, instanceId } = payload;

    // 3. Get User Role (needed for admin actions)
    const userRole = await getUserRole(supabaseClient, user.id);
    const isAuthorizedAdmin = userRole === 'admin';

    console.log(`Integration access request: action=${action}, user=${user.id}, role=${userRole}, integrationId=${integrationId}, profileId=${profileId}, accessId=${accessId}, instanceId=${instanceId || 'N/A'}`);

    // 4. Process Action using a switch statement
    switch (action) {
      case 'fetchAccess': {
        if (!integrationId) {
          throw new Error('integrationId is required for fetchAccess');
        }
        const data = await fetchAccessDb(supabaseClient, integrationId);
        console.log(`Fetched ${data?.length || 0} access records for integration ${integrationId}`);
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
      }

      case 'grantAccess': {
        if (!isAuthorizedAdmin) {
          throw new Error('Forbidden: Admin role required'); // Caught for 403
        }
        if (!integrationId || !profileId) {
          throw new Error('integrationId and profileId are required for grantAccess'); // Caught for 400
        }
        const error = await grantAccessDb(supabaseClient, integrationId, profileId, user.id);
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            throw new Error('Access already granted'); // Caught for 409
          }
          throw new Error(`Database error granting access: ${error.message}`); // Caught for 500
        }
        console.log(`Access granted for profile ${profileId} to integration ${integrationId} by ${user.id}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
      }

      case 'revokeAccess': {
        if (!isAuthorizedAdmin) {
          throw new Error('Forbidden: Admin role required'); // Caught for 403
        }
        if (!accessId) {
          throw new Error('accessId is required for revokeAccess'); // Caught for 400
        }
        const error = await revokeAccessDb(supabaseClient, accessId);
        if (error) {
           // Check for specific errors like not found (PGRST116 might indicate this)
           if (error.code === 'PGRST116') {
              throw new Error('Access record not found'); // Caught for 404
           }
          throw new Error(`Database error revoking access: ${error.message}`); // Caught for 500
        }
        console.log(`Access revoked for access record ${accessId} by ${user.id}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 // Or 204 No Content
        });
      }

      case 'connectToInstance': {
        // Note: This action only fetches info, doesn't perform connection.
        if (!instanceId) {
          throw new Error('instanceId is required for connectToInstance'); // Caught for 400
        }
        const { baseUrl } = await fetchEvolutionConnectionInfoDb(supabaseClient, instanceId);
        const apiUrl = `${baseUrl}/instance/connect/${instanceId}`; // Construct potential URL
        console.log(`Connection info fetched for instance ${instanceId}. Potential URL: ${apiUrl}`);
        // Return info (adjust payload as needed)
        return new Response(JSON.stringify({
          success: true,
          message: `Connection info fetched for instance ${instanceId}`,
          instanceId: instanceId,
          connectUrl: apiUrl // Example info to return
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
      }

      default:
        // Type safety: If action is not one of the known values
        console.log(`Invalid action requested: ${action}`);
        throw new Error('Invalid action specified'); // Caught for 400
    }

  } catch (error) {
    console.error('Error in get_integration_access handler:', error.message);
    let status = 500;
    // Set specific statuses based on error messages
    if (error.message === "Invalid JSON body") status = 400;
    if (error.message === "Missing required field: action") status = 400;
    if (error.message.includes("is required for")) status = 400; // Parameter validation errors
    if (error.message.startsWith("Authentication error") || error.message === "User not authenticated.") status = 401;
    if (error.message === 'Forbidden: Admin role required') status = 403;
    if (error.message === 'Access already granted') status = 409; // Conflict
    if (error.message === 'Access record not found') status = 404;
    if (error.message.includes("not found")) status = 404; // General not found errors
    if (error.message === 'Invalid action specified') status = 400;

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
