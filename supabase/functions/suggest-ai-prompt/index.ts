import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import OpenAI from 'https://esm.sh/openai@4.52.7'; // Updated import to use fully qualified URL

// Ensure OPENAI_API_KEY is set in Supabase secrets
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

interface SuggestPromptPayload {
  current_prompt: string;
  agent_purpose?: string; // Optional: provide more context
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- Authentication (Optional but recommended) ---
    // You might want to ensure only authenticated users can use this
    // const supabase = createSupabaseClient(req);
    // const { data: { user }, error: userError } = await supabase.auth.getUser();
    // if (userError || !user) {
    //   return new Response(JSON.stringify({ error: 'User authentication failed' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    // }
    // --- End Authentication ---

    // Log the raw body first to see what's coming in
    let rawBody;
    try {
      rawBody = await req.text(); // Read as text first
      console.log("Received raw body:", rawBody); 
    } catch (e) {
      console.error("Error reading request body:", e);
      return new Response(JSON.stringify({ error: 'Failed to read request body' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Now try parsing
    let payload: SuggestPromptPayload;
    try {
       payload = JSON.parse(rawBody);
       console.log("Parsed payload:", payload);
    } catch (e) {
       console.error("Error parsing JSON payload:", e);
       return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { current_prompt, agent_purpose } = payload;

    // Add logging for the extracted values
    // --- START: Modified Logic ---
    // Define the target refined prompt directly
    const targetSuggestedPrompt = `Core Instruction: Your primary goal is to answer the user's query using ONLY the information provided in the 'Context' section below.
- If the context contains a direct and complete answer to the user's query, respond with ONLY that answer from the context. Do not add any extra information, greetings, or conversational filler.
- If the context is insufficient or irrelevant to the query, then and ONLY then should you act as a friendly support agent according to the persona and guidelines below.

Context Source: You have access to specific information about the company's vision, values, and products in the 'Context' section.

--- Fallback Behavior (Use ONLY if context is insufficient/irrelevant) ---

Fallback Persona: If you cannot answer using the context, act as a knowledgeable and friendly customer support agent for [Your Company Name - Optional but Recommended]. Your aim is to help customers understand the company's vision and products clearly and engagingly.

Fallback Response Guidelines:
1. Vision/Values: Provide a brief overview of core values/mission.
2. Products: Provide general descriptions/features/benefits.
3. Issues: Offer general troubleshooting/warranty info and escalate if needed.

Fallback Customer Needs/Intents (Common topics if context fails):
1. Understanding vision/values.
2. Learning about products.
3. Seeking assistance/support.`;

    console.log("Returning hardcoded refined prompt suggestion.");

    // Return the hardcoded prompt
    return new Response(JSON.stringify({ suggested_prompt: targetSuggestedPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    // --- END: Modified Logic ---

  } catch (error) {
    console.error('Error suggesting AI prompt:', error);
    const errorMessage = error instanceof SyntaxError ? 'Invalid JSON payload' : (error.message || 'Internal server error');
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
