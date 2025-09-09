
import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Define generateEmbedding function directly in this file
async function generateEmbedding(content: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set.');
    throw new Error('OpenAI API key is missing in edge function environment.');
  }

  try {
    console.log('Calling OpenAI API to generate embedding for content (first 100 chars):', content.substring(0, 100));
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
      const errorData = await response.json();
      console.error('OpenAI API error:', response.status, response.statusText, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    if (!responseData.data || responseData.data.length === 0 || !responseData.data[0].embedding) {
      console.error('OpenAI API returned no embedding data:', responseData);
      throw new Error('OpenAI API returned no embedding data.');
    }
    console.log('Successfully generated embedding of length:', responseData.data[0].embedding.length);
    return responseData.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Add CORS headers to enable cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, content, document_id } = await req.json();

    if (action === 'save_chunk') {
      if (!content) {
        return new Response(
          JSON.stringify({ error: 'Content is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Received save_chunk request for document_id:', document_id);
      console.log('Content length for embedding generation:', content.length);


      if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not set in edge function environment');
        return new Response(
          JSON.stringify({ error: 'OPENAI_API_KEY is not set in edge function environment' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // --- Removed fetching full document content ---

      // Generate embedding for the *individual chunk content*
      console.log('Attempting to generate embedding for chunk content...');
      // Ensure content is not empty before generating embedding
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
         throw new Error("Chunk content is empty or invalid, cannot generate embedding.");
      }
      const contentEmbedding = await generateEmbedding(content); // <<< Use chunk content here

      if (!contentEmbedding || contentEmbedding.length === 0) {
        console.error('Generated embedding is null or empty.');
        return new Response(
          JSON.stringify({ error: 'Failed to generate valid embedding for chunk content.' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Generated embedding of length:', contentEmbedding.length);

      // Insert the chunk into the knowledge_chunks table
      console.log('Inserting chunk into database...');
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .insert([{ 
          id: uuidv4(),
          content: content, 
          document_id: document_id, 
          embedding: contentEmbedding,
          metadata: JSON.stringify({}),
          sequence: 0,
        }]);

      if (error) {
        console.error('Error inserting knowledge chunk:', error);
        return new Response(
          JSON.stringify({ error: 'Error inserting knowledge chunk: ' + error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Successfully saved chunk');
      const response = {
        message: 'Knowledge chunk saved successfully',
        data: data,
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
