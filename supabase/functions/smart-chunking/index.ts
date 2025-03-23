
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { cors } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return cors(req, new Response('ok'));
  }

  try {
    const { content, maxChunks = 10 } = await req.json();

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
        new Response(
          JSON.stringify({ error: 'OPENAI_API_KEY is not set in environment variables' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    }

    // Call OpenAI to chunk the content intelligently
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at breaking down large documents into meaningful chunks for vector databases. 
            Your task is to split the provided content into logical, semantic chunks that will serve well as vector embeddings. 
            Each chunk should be a cohesive unit of information, ideally with context intact.
            Return exactly JSON array of strings, with each string being a chunk. No other formatting or explanation.
            Limit to maximum ${maxChunks} chunks, but use fewer if that makes more sense for the content.
            The chunks should be of reasonable size, not too short or too long.`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    let chunks;
    
    try {
      // Parse the JSON response from OpenAI
      const jsonResponse = JSON.parse(responseData.choices[0].message.content);
      chunks = Array.isArray(jsonResponse) ? jsonResponse : jsonResponse.chunks;
      
      if (!Array.isArray(chunks)) {
        console.error('Invalid chunks format:', chunks);
        throw new Error('Invalid response format from OpenAI');
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.log('Raw response:', responseData.choices[0].message.content);
      
      // Fallback to simple paragraph splitting
      chunks = content
        .split(/\n\s*\n/)
        .map(para => para.trim())
        .filter(para => para.length > 0);
    }

    return cors(
      req,
      new Response(JSON.stringify({ chunks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (error) {
    console.error('Error in smart-chunking function:', error);
    return cors(
      req,
      new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
});
