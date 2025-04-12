
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// Import using aliases from import_map.json
import "https://deno.land/x/xhr@0.1.0/mod.ts"; 
import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js"; 
import { corsHeaders } from "../_shared/cors.ts"; 

// Define the expected type for OpenAI messages
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Remove local corsHeaders definition
/* 
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} 
*/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversationId } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      // Add Supabase client options if needed, e.g., for schema
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    ) as SupabaseClient; 

    // Fetch messages associated with the conversation using the correct table and column
    const { data: conversationMessages, error: messagesError } = await supabaseClient
      .from('messages') // Target the 'messages' table
      .select('content, sender_participant_id, created_at') 
      .eq('conversation_id', conversationId) // Filter by the correct foreign key
      .order('created_at', { ascending: true }); 

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      throw messagesError;
    }
    
    if (!conversationMessages || conversationMessages.length === 0) {
       // Handle case where conversation has no messages
       return new Response(
         JSON.stringify({ conversation_id: conversationId, sentiment: 'unknown', description: 'No messages found for analysis.' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
    }

    // Fetch participant details to determine role (user/assistant)
    const participantIds = conversationMessages.map(msg => msg.sender_participant_id).filter(id => !!id); // Ensure filtering works correctly
    let formattedMessages: OpenAIMessage[] = []; // Explicitly type the array

    if (participantIds.length > 0) {
        const { data: participants, error: participantError } = await supabaseClient
          .from('conversation_participants') 
          .select('id, customer_id') // Select necessary fields
          .in('id', participantIds);

        if (participantError) {
          console.error("Error fetching participants:", participantError);
          // Decide if you want to throw or proceed without participant info
          throw participantError; 
        }

        // Create a map for quick lookup
        const participantMap = new Map(participants?.map(p => [p.id, p]) || []);

        // Format messages for OpenAI, determining role based on participant info
        formattedMessages = conversationMessages.map((msg): OpenAIMessage => { // Ensure returned object matches OpenAIMessage
          const participant = participantMap.get(msg.sender_participant_id);
          // Determine role: 'user' if it's linked to a customer, otherwise 'assistant'
          const role: 'user' | 'assistant' = participant?.customer_id ? 'user' : 'assistant'; 
          return {
            role: role, 
            content: msg.content || '', // Ensure content is not null/undefined
          };
        });
    } else {
       // Fallback if no participant IDs found (might indicate an issue)
       formattedMessages = conversationMessages.map((msg): OpenAIMessage => ({ // Ensure returned object matches OpenAIMessage
         role: 'user', // Default role if participants can't be determined
         content: msg.content || '',
       }));
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    // Analyze sentiment with OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the following conversation messages and determine the overall sentiment. Respond ONLY with a JSON object containing: "sentiment" (string: "bad", "moderate", or "good") and "description" (string: a brief explanation for the sentiment, focusing on the effectiveness of the interaction in helping the customer). Example: {"sentiment": "good", "description": "The assistant effectively resolved the user\'s issue."}'
          },
          ...formattedMessages // Use the correctly formatted messages
        ],
        response_format: { type: "json_object" }, // Ensure OpenAI returns JSON
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json()
    // Parse the response content directly
    const analysisResult = JSON.parse(openAIData.choices[0].message.content);

    // Return the analysis result directly, including the conversationId for reference
    const responsePayload = {
      conversation_id: conversationId,
      sentiment: analysisResult.sentiment,
      description: analysisResult.description,
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in analyze-sentiment function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
