import { serve } from 'std/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Ensure environment variables are available
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY'); // Or SERVICE_ROLE_KEY if preferred for direct DB access
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
  console.error('Missing one or more required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY');
  throw new Error('Missing required environment variables for the edge function.');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

async function generateEmbedding(content: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set.');
    throw new Error('OpenAI API key is missing in edge function environment.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002', // Produces 1536-dimensional embeddings
        input: content,
        encoding_format: 'float',
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    return responseData.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content: chunkContent, metadata } = await req.json();

    if (!chunkContent || typeof chunkContent !== 'string' || chunkContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Chunk content is required and must be a non-empty string.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating embedding for the provided content...');
    const embeddingVector = await generateEmbedding(chunkContent);
    console.log(`Generated embedding of length: ${embeddingVector.length}`);

    // The pgvector format for Supabase client is an array of numbers,
    // or a string like '[0.1,0.2,...]' if inserting via SQL string.
    // The Supabase JS client handles array of numbers correctly for vector columns.

    console.log('Inserting chunk into public.documents table...');
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        id: uuidv4(),
        content: chunkContent,
        embedding: embeddingVector, // Pass the array of numbers directly
        metadata: metadata || {},   // Ensure metadata is at least an empty object
      }])
      .select(); // Optionally select to get the inserted row back

    if (error) {
      console.error('Error inserting document chunk:', error);
      return new Response(
        JSON.stringify({ error: `Error inserting document chunk: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully ingested document chunk:', data);
    return new Response(
      JSON.stringify({ message: 'Document chunk ingested successfully', data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
