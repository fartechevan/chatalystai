
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { cors } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from "uuid";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const supabase: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Define generateEmbedding function directly in this file
async function generateEmbedding(content: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: content,
        encoding_format: 'float',
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    return responseData.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return cors(req, new Response('ok'));
  }

  try {
    const { action, content, document_id } = await req.json();

    if (action === 'save_chunk') {
      if (!content) {
        return cors(
          req,
          new Response(JSON.stringify({ error: 'Content is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      const apiKey = Deno.env.get('OPENAI_API_KEY');
      if (!apiKey) {
        return cors(
          req,
          new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set in environment variables' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return cors(
          req,
          new Response(
            JSON.stringify({ error: 'SUPABASE_URL or SUPABASE_ANON_KEY is not set' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      // Generate embedding for the content
      const contentEmbedding = await generateEmbedding(content);

      // Convert the embedding to a string
      const embeddingString = JSON.stringify(contentEmbedding);

      // Insert the chunk into the knowledge_chunks table
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .insert([{ 
          id: uuidv4(),
          content: content, 
          document_id: document_id, 
          embedding: embeddingString,
          metadata: JSON.stringify({}),
          sequence: 0,
        }]);

      if (error) {
        console.error('Error inserting knowledge chunk:', error);
        return cors(
          req,
          new Response(JSON.stringify({ error: 'Error inserting knowledge chunk' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      const response = {
        message: 'Knowledge chunk saved successfully',
        data: data,
      };

      return cors(
        req,
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    } else {
      return cors(
        req,
        new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  } catch (error) {
    console.error(error);
    return cors(
      req,
      new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
});
