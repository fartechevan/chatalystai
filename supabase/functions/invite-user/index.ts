/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface InviteRequest {
  email: string;
  role: string; // e.g., 'admin', 'member'
  redirectTo?: string; // Optional redirect URL for the invite link
}

serve(async (req: Request) => {
  console.log('invite-user function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, role, redirectTo }: InviteRequest = await req.json();
    console.log('Request JSON parsed:', { email, role, redirectTo });

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email and role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase environment variables are not set.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('Supabase admin client initialized.');

    // Prepare data to be stored with the invitation (e.g., in raw_app_meta_data)
    const inviteData = {
      role: role,
      invited_at: new Date().toISOString(),
    };

    // Determine the redirect URL
    // Use the provided redirectTo, or a default if not specified.
    // This URL is where the user will be redirected after clicking the invite link in their email.
    const finalRedirectTo = redirectTo || `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/auth/confirm-invite`;
    console.log(`Inviting user: ${email} with role: ${role}. Redirecting to: ${finalRedirectTo}`);

    const { data: inviteOpData, error: inviteOpError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: inviteData,
      redirectTo: finalRedirectTo,
    });

    if (inviteOpError) {
      console.error('Error response from inviteUserByEmail:', JSON.stringify(inviteOpError, null, 2));
      // Handle common errors like user already registered
      if (inviteOpError.message && inviteOpError.message.toLowerCase().includes('user with this email address has already been registered')) {
        return new Response(JSON.stringify({ error: 'This email address is already registered.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      let errorStatus = 500;
      if (typeof inviteOpError === 'object' && inviteOpError !== null && 'status' in inviteOpError && typeof (inviteOpError as { status: unknown }).status === 'number') {
        errorStatus = (inviteOpError as { status: number }).status;
      }
      return new Response(JSON.stringify({ error: inviteOpError.message || 'Failed to invite user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorStatus,
      });
    }

    console.log('Invitation sent successfully:', inviteOpData);
    return new Response(JSON.stringify({ message: 'Invitation sent successfully.', user: inviteOpData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: unknown) {
    console.error('Error in invite-user function (outer catch):', e);
    let errorMessage = 'An unexpected error occurred.';
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
});
