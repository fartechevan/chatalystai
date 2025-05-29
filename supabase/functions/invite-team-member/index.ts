/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
// supabase/functions/invite-team-member/index.ts
import { serve } from 'std/http/server.ts' // Use import_map.json for std library
import { createClient } from '@supabase/supabase-js' // Use bare specifier to rely on import_map.json
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  console.log('invite-team-member function invoked.');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Attempting to parse request JSON...');
    const { email, team_id, team_name } = await req.json();
    console.log('Request JSON parsed:', { email, team_id, team_name });

    if (!email || !team_id || !team_name) {
      console.error('Missing required fields:', { email, team_id, team_name });
      return new Response(JSON.stringify({ error: 'Missing required fields: email, team_id, and team_name' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Supabase URL from env:', supabaseUrl ? 'Loaded' : 'NOT LOADED');
    console.log('Service Role Key from env:', serviceRoleKey ? 'Loaded' : 'NOT LOADED');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase environment variables are not set.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Initialize Supabase admin client
    console.log('Initializing Supabase admin client...');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('Supabase admin client initialized.');

    // Invite user by email
    console.log(`Attempting to invite user: ${email} to team: ${team_id}`);
    const { data: inviteOpData, error: inviteOpError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        team_id: team_id,
        team_name: team_name, // Store team_name for potential use in welcome emails or UI
      },
      // redirectTo: 'http://localhost:5173/auth/confirm' // Optional: specify redirect URL after confirmation
    });

    if (inviteOpError) {
      console.error('Error response from inviteUserByEmail:', JSON.stringify(inviteOpError, null, 2));
      // Check if it's the specific "email_exists" error
      // AuthApiError has a status property, and sometimes a more specific code.
      // Based on logs, error.code === "email_exists" and error.status === 422
      if (inviteOpError.code === 'email_exists' || (inviteOpError.message && inviteOpError.message.toLowerCase().includes('user with this email address has already been registered'))) {
        console.log(`User with email ${email} already exists. Attempting to add them directly to team ${team_id}.`);
        
        // 1. Get the existing user's ID
        // listUsers does not directly filter by email. We fetch a page and filter.
        // For a very large number of users, a more optimized approach might be needed.
        const { data: listUsersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000, // Adjust perPage as needed, up to a reasonable limit.
        });

        if (listUsersError) {
          console.error('Error listing users:', listUsersError);
          return new Response(JSON.stringify({ error: `Failed to process existing user: ${listUsersError.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        const existingUser = listUsersData?.users.find(u => u.email === email);

        if (existingUser) {
          const existingUserId = existingUser.id;
          console.log(`Found existing user ID: ${existingUserId} for email ${email}`);

          // 2. Add existing user to the team_users table
          const { error: addUserToTeamError } = await supabaseAdmin
            .from('team_users')
            .insert({ team_id: team_id, user_id: existingUserId, role: 'member' }); // Default role 'member'

          if (addUserToTeamError) {
            // PostgreSQL unique violation error code is '23505'.
            if (addUserToTeamError.code === '23505') { 
              console.log(`User ${existingUserId} is already a member of team ${team_id}.`);
              return new Response(JSON.stringify({ message: `User ${email} is already a member of this team.` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, 
              });
            }
            console.error(`Error adding existing user ${existingUserId} to team ${team_id}:`, addUserToTeamError);
            return new Response(JSON.stringify({ error: `Failed to add existing user to team: ${addUserToTeamError.message}` }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            });
          }
          
          console.log(`Successfully added existing user ${existingUserId} to team ${team_id}.`);
          return new Response(JSON.stringify({ message: `User ${email} already existed and has been added to the team.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          console.error(`User with email ${email} reported as existing by invite API, but not found by listUsers.`);
          return new Response(JSON.stringify({ error: 'Inconsistent user state. Please try again.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      }
      // For other errors from inviteUserByEmail
      let errorStatus = 500;
      if (typeof inviteOpError === 'object' && inviteOpError !== null && 'status' in inviteOpError && typeof (inviteOpError as { status: unknown }).status === 'number') {
        errorStatus = (inviteOpError as { status: number }).status;
      }
      return new Response(JSON.stringify({ error: inviteOpError.message || 'Failed to invite user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorStatus,
      });
    }

    // Original success path for new user invitation
    return new Response(JSON.stringify({ message: 'Invitation sent successfully', user: inviteOpData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: unknown) { // Changed from 'any' to 'unknown'
    console.error('Error in invite-team-member function (outer catch):', e);
    let errorMessage = 'An unexpected error occurred in the function.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as {message?: unknown}).message === 'string') {
      errorMessage = (e as {message: string}).message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
