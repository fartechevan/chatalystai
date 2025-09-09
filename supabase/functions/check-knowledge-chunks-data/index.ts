import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check total count of knowledge_chunks
    const { count: totalCount, error: countError } = await supabaseClient
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw countError
    }

    // Get a few sample records
    const { data: sampleData, error: sampleError } = await supabaseClient
      .from('knowledge_chunks')
      .select('id, content, document_id, created_at, enabled')
      .limit(5)

    if (sampleError) {
      throw sampleError
    }

    // Check enabled vs disabled chunks
    const { count: enabledCount, error: enabledError } = await supabaseClient
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true)

    if (enabledError) {
      throw enabledError
    }

    const { count: disabledCount, error: disabledError } = await supabaseClient
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', false)

    if (disabledError) {
      throw disabledError
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalChunks: totalCount,
        enabledChunks: enabledCount,
        disabledChunks: disabledCount,
        sampleData: sampleData,
        isEmpty: totalCount === 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})