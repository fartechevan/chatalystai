/// <reference types="https://deno.land/x/types/deno.d.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import OpenAI from 'https://esm.sh/openai@4.52.7';

// Ensure OPENAI_API_KEY is set in Supabase secrets
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

interface SuggestPromptPayload {
  current_prompt: string;
  agent_purpose?: string; // Optional: provide more context
  enable_appointment_booking?: boolean; // Optional: enable appointment booking capabilities
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

    const { current_prompt, agent_purpose, enable_appointment_booking } = payload;

    // Add logging for the extracted values
    console.log("Current prompt:", current_prompt);
    console.log("Agent purpose:", agent_purpose);
    console.log("Enable appointment booking:", enable_appointment_booking);

    // --- START: Modified Logic ---
    // Use OpenAI to enhance the existing prompt with appointment booking capabilities
    const systemMessage = `You are an AI assistant that helps improve chatbot prompts. Your task is to enhance the given prompt by adding appointment booking capabilities when requested.

Guidelines:
1. Keep the original prompt's core functionality and tone
2. Seamlessly integrate appointment booking capabilities when enabled
3. Make the enhanced prompt clear and actionable
4. Ensure the appointment booking section is prominent and easy to understand`;

    let userMessage = `Please enhance this chatbot prompt`;
    if (agent_purpose) {
      userMessage += ` for a ${agent_purpose}`;
    }
    userMessage += `:

"${current_prompt}"`;

    if (enable_appointment_booking) {
      userMessage += `

IMPORTANT: The enhanced prompt MUST explicitly state its ability to handle appointment booking. It should include:

1.  **Clear instructions for handling appointment requests**: The AI should be able to initiate and manage the appointment booking process.
2.  **Information to collect**: The AI must gather details such as service type, preferred date/time, and customer contact information.
3.  **Friendly example responses**: Provide examples of how the AI should respond during the appointment booking process.
4.  **Guidelines for confirming details**: The AI should confirm appointment details with the customer.

Ensure the appointment booking functionality is seamlessly integrated with the existing prompt while being prominent and easy to follow.`;
    } else {
      userMessage += `

Please improve this prompt for better clarity, engagement, and effectiveness while maintaining its original purpose.`;
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const targetSuggestedPrompt = completion.choices[0]?.message?.content || current_prompt;

      console.log("Returning refined prompt suggestion with conditional appointment booking.");

      // Return the prompt
      return new Response(JSON.stringify({ suggested_prompt: targetSuggestedPrompt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (openaiError) {
      console.error('Error calling OpenAI:', openaiError);
      // Fallback to original prompt if OpenAI fails
      return new Response(JSON.stringify({ suggested_prompt: current_prompt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    // --- END: Modified Logic ---

  } catch (error: unknown) {
    console.error('Error suggesting AI prompt:', error);
    const errorMessage = error instanceof SyntaxError ? 'Invalid JSON payload' : 
      (error instanceof Error ? error.message : 'Internal server error');
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
