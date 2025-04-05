
// Supabase Edge Function to handle integration access operations
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const requestData = await req.json()
    const { action, configId, profileId, accessId } = requestData

    if (action === 'fetchAccess') {
      const { data, error } = await supabaseClient
        .from('profile_integration_access')
        .select(`
          id,
          profile_id,
          profiles:profile_id (id, name, email, role)
        `)
        .eq('integration_config_id', configId)

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'grantAccess') {
      const { error } = await supabaseClient
        .from('profile_integration_access')
        .insert({
          profile_id: profileId,
          integration_config_id: configId,
          created_by: user.id,
        })

      if (error) {
        if (error.code === '23505') {
          return new Response(JSON.stringify({ error: 'Access already granted' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'revokeAccess') {
      const { error } = await supabaseClient
        .from('profile_integration_access')
        .delete()
        .eq('id', accessId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
