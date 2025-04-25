import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import OpenAI from 'openai'; // Use OpenAI library

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
    console.log(`Extracted current_prompt: "${current_prompt}", agent_purpose: "${agent_purpose}"`);

    if (!current_prompt && !agent_purpose) {
       return new Response(JSON.stringify({ error: 'Please provide either the current prompt or agent purpose.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct the enhanced meta-prompt for OpenAI using the provided template
    let metaPrompt = `You are an expert in crafting effective system prompts for AI chatbots. 
Generate or refine a system prompt based on the provided details, following this structure:

*   **Chatbot Persona:** {Describe the chatbot's role, tone, and expertise.}
*   **Customer Needs/Intents:** {List the common reasons customers will interact with the chatbot.}
*   **Knowledge Base:** {Specify the information the chatbot can access and how it is structured.}
*   **Response Guidelines:** {Provide instructions for how the chatbot should handle various customer interactions. Include 3 specific examples based on the context provided below.}

Use the following information to fill out the template:`;

    if (agent_purpose) {
      metaPrompt += `\n- The agent's main purpose is: ${agent_purpose}.`;
    }
    if (current_prompt) {
       metaPrompt += `\n- Current prompt text (use this as primary input for refinement/generation):\n"${current_prompt}"`;
    } else if (agent_purpose) {
       // If no current prompt, generate based on purpose
       metaPrompt += `\n- Generate a starting system prompt based *only* on the agent's purpose described above.`;
    }

     metaPrompt += `\n\nOutput *only* the completed system prompt using the template structure above. Do not include any introductory text, explanations, or markdown formatting for the section titles (like bolding). Just provide the plain text content for each section.`;


    console.log("Sending prompt to OpenAI:", metaPrompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or your preferred model
      messages: [{ role: "user", content: metaPrompt }],
      temperature: 0.7,
      max_tokens: 300, // Adjust as needed
      n: 1,
    });

    const suggestedPrompt = completion.choices[0]?.message?.content?.trim();

    if (!suggestedPrompt) {
      throw new Error('OpenAI did not return a suggestion.');
    }

    console.log("Received suggestion from OpenAI:", suggestedPrompt);

    return new Response(JSON.stringify({ suggested_prompt: suggestedPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

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
