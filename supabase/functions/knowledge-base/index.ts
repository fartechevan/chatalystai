import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { cors } from '../_shared/cors.ts';
import { generateEmbedding } from '../../src/lib/embeddings.ts';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from "uuid";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const supabase: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

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

      if (!OPENAI_API_KEY) {
        return cors(
          req,
          new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), {
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
