import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { cors } from '../_shared/cors.ts';
import { generateEmbedding } from '../../src/lib/embeddings.ts';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const supabase: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return cors(req, new Response('ok'));
  }

  try {
    const { question } = await req.json();

    if (!question) {
      return cors(
        req,
        new Response(JSON.stringify({ error: 'Question is required' }), {
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

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Search the knowledge base for chunks with similar embeddings
    const { data: chunks, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: questionEmbedding,
      similarity_threshold: 0.7,
      match_count: 3,
    });

    if (error) {
      console.error('Error fetching knowledge chunks:', error);
      return cors(
        req,
        new Response(JSON.stringify({ error: 'Error fetching knowledge chunks' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    const answer = `This is a placeholder answer for the question: ${question}`;
    const references = chunks.map((chunk) => chunk.id);

    const response = {
      answer: answer,
      references: references,
    };

    return cors(
      req,
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
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
