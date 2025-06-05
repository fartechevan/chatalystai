import { serve } from 'std/http/server.ts' // Use import map alias
import { createClient } from '@supabase/supabase-js' // Use import map alias
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, tenant_id, role } = await req.json()

    if (!email || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Email and tenant_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Optional: Validate the inviter's permissions here
    // This requires getting the inviter's user_id from the request Authorization header
    // and checking if they are an owner/admin of the target tenant_id in tenant_users table.
    // For simplicity, this example assumes the function is protected by other means
    // or that RLS on a calling table handles this.
    // If not, add auth checks:
    // const authHeader = req.headers.get('Authorization')
    // if (!authHeader) {
    //   return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //     status: 401,
    //   })
    // }
    // const token = authHeader.replace('Bearer ', '')
    // const { data: { user: inviterUser }, error: inviterError } = await supabaseClient.auth.getUser(token)
    // if (inviterError || !inviterUser) {
    //    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    // }
    // Check inviterUser.id against tenant_users for tenant_id with 'owner' or 'admin' role.

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_tenant_id: tenant_id,
        invited_role: role || 'member', // Pass tenant_id and role in metadata
      },
      // redirectTo: 'YOUR_APP_URL_FOR_USER_TO_SET_PASSWORD_AND_COMPLETE_SIGNUP' // Optional: redirect URL
    })

    if (error) {
      console.error('Error inviting user:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ message: 'Invite sent successfully', user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('Catch-all error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
