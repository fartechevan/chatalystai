import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface RequestBody {
  content: string;
  maxChunks?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { content, maxChunks = 10 } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no OpenAI API key, fall back to simple chunking
    if (!OPENAI_API_KEY) {
      console.log('No OpenAI API key found, using fallback chunking');
      const chunks = fallbackChunking(content, maxChunks);
      return new Response(
        JSON.stringify({ chunks }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use OpenAI to create smart chunks
    const chunks = await createSmartChunks(content, maxChunks);
    
    return new Response(
      JSON.stringify({ chunks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in smart chunking:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createSmartChunks(content: string, maxChunks: number): Promise<string[]> {
  try {
    // Prepare a simpler version of the text if it's too long
    let textToProcess = content;
    if (content.length > 10000) {
      // For very long content, we'll use a sample to inform the chunking
      textToProcess = content.substring(0, 5000) + '\n...[content truncated]...\n' + 
                     content.substring(content.length - 5000);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that helps with document chunking for semantic search. Your task is to split the provided text into logical, semantically meaningful chunks.'
          },
          {
            role: 'user',
            content: `Split the following text into ${maxChunks} semantically meaningful chunks. Each chunk should be a complete thought or section. Return only a JSON array of text chunks without any additional text or markdown formatting. Make sure the chunks cover the entire text without omitting any content.\n\nTEXT TO CHUNK:\n${textToProcess}`
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;
    
    // Parse the JSON array from the response
    try {
      // Extract JSON array from the response if it's wrapped in markdown or explanatory text
      const jsonMatch = assistantMessage.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : assistantMessage;
      const chunks = JSON.parse(jsonString);
      
      if (!Array.isArray(chunks)) {
        throw new Error('Response is not an array');
      }
      
      return chunks;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Response content:', assistantMessage);
      // Fall back to simple chunking if we can't parse the AI response
      return fallbackChunking(content, maxChunks);
    }
  } catch (error) {
    console.error('Error in createSmartChunks:', error);
    // Fall back to simple chunking on errors
    return fallbackChunking(content, maxChunks);
  }
}

function fallbackChunking(content: string, maxChunks: number): string[] {
  // Simple paragraph-based chunking as fallback
  const paragraphs = content.split(/\n\s*\n/);
  const chunks: string[] = [];
  
  // If we have fewer paragraphs than maxChunks, return the paragraphs
  if (paragraphs.length <= maxChunks) {
    return paragraphs.filter(p => p.trim().length > 0);
  }
  
  // Otherwise, combine paragraphs to get close to the desired number of chunks
  const paragraphsPerChunk = Math.ceil(paragraphs.length / maxChunks);
  
  for (let i = 0; i < paragraphs.length; i += paragraphsPerChunk) {
    const chunk = paragraphs.slice(i, i + paragraphsPerChunk).join('\n\n');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}
