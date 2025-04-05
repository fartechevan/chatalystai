
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
    const { action, configId, profileId, accessId, instanceId } = requestData

    console.log(`Integration access request: action=${action}, user=${user.id}, configId=${configId}, profileId=${profileId}, instanceId=${instanceId || 'N/A'}`)

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
      console.log(`Fetched ${data?.length || 0} access records for config ${configId}`)
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
          console.log(`Access already granted for profile ${profileId} to config ${configId}`)
          return new Response(JSON.stringify({ error: 'Access already granted' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        throw error
      }

      console.log(`Access granted for profile ${profileId} to config ${configId} by ${user.id}`)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'revokeAccess') {
      const { error } = await supabaseClient
        .from('profile_integration_access')
        .delete()
        .eq('id', accessId)

      if (error) throw error

      console.log(`Access revoked for access record ${accessId} by ${user.id}`)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'connectToInstance') {
      if (!instanceId) {
        return new Response(JSON.stringify({ error: 'Instance ID is required' }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      // Log the connection attempt
      console.log(`Connecting to Evolution API instance: ${instanceId}`)
      
      // Get the integration config for the apiKey
      const { data: config, error: configError } = await supabaseClient
        .from('integrations_config')
        .select('integration_id, base_url')
        .eq('instance_id', instanceId)
        .single()
        
      if (configError) {
        console.error(`Error fetching config for instance ${instanceId}:`, configError)
        throw configError
      }
      
      // Get the base_url from the integration
      const { data: integration, error: integrationError } = await supabaseClient
        .from('integrations')
        .select('base_url')
        .eq('id', config.integration_id)
        .single()
      
      if (integrationError) {
        console.error(`Error fetching integration for config ${config.integration_id}:`, integrationError)
        throw integrationError
      }
      
      const baseUrl = integration.base_url || 'https://api.evoapicloud.com'
      const apiUrl = `${baseUrl}/instance/connect/${instanceId}`
      
      console.log(`Connecting to instance via Evolution API: ${apiUrl}`)
      
      // Return success response for logging purposes
      return new Response(JSON.stringify({ 
        success: true,
        message: `Connecting to instance ${instanceId} via ${apiUrl}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      console.log(`Invalid action requested: ${action}`)
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('Error in get_integration_access function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
