import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Generate embedding using OpenAI
async function generateEmbedding(content: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: content,
      encoding_format: 'float',
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const responseData = await response.json();
  return responseData.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, match_threshold = 0.5, match_count = 5, filter_document_ids } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating embedding for query:', query);
    const queryEmbedding = await generateEmbedding(query);

    console.log('Calling match_chunks with parameters:', {
      match_threshold,
      match_count,
      filter_document_ids: filter_document_ids || 'none'
    });

    // Test both versions of match_chunks
    const matchParams = {
      query_embedding: queryEmbedding,
      match_threshold,
      match_count,
      ...(filter_document_ids && { filter_document_ids })
    };

    const { data: matchedChunks, error: matchError } = await supabase.rpc(
      'match_chunks',
      matchParams
    );

    if (matchError) {
      console.error('Error calling match_chunks:', matchError);
      return new Response(
        JSON.stringify({ error: 'Database error: ' + matchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${matchedChunks?.length || 0} matching chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        parameters: {
          match_threshold,
          match_count,
          filter_document_ids: filter_document_ids || null
        },
        results: {
          count: matchedChunks?.length || 0,
          chunks: matchedChunks || []
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});