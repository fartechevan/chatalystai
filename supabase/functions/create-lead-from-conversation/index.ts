import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "create-lead-from-conversation" up and running!`)

interface RequestPayload {
  conversationId: string;
  customerId: string;
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversationId, customerId }: RequestPayload = await req.json();

    if (!conversationId || !customerId) {
      throw new Error("Missing required parameters: conversationId and customerId");
    }

    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      // { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Use service role key for backend operations
    )
    
    // Use service role key for elevated privileges needed for backend operations
     const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );


    // 1. Check if conversation already has a lead
    const { data: existingConvData, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('lead_id')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (convError) throw convError;
    if (existingConvData?.lead_id) {
      console.log(`Conversation ${conversationId} already has lead ${existingConvData.lead_id}`);
      // Optionally return the existing lead ID or a specific message
      return new Response(JSON.stringify({ message: 'Conversation already has a lead', lead_id: existingConvData.lead_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      })
    }

    // 2. Fetch customer details (optional, e.g., to get name for lead)
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .single(); // Use single() as customer should exist

    if (customerError) {
       console.error("Error fetching customer:", customerError);
       // Decide if this is critical. Maybe proceed without customer name?
       // For now, let's throw an error if customer not found.
       throw new Error(`Customer with ID ${customerId} not found.`);
    }
    const leadName = customerData?.name || `Lead from Conversation ${conversationId.substring(0, 8)}`;


    // 3. Fetch the default pipeline stage ID
     const { data: defaultStageData, error: stageError } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id')
      .eq('is_default', true)
      .limit(1)
      .single();

    if (stageError || !defaultStageData) {
      console.error('Error fetching default pipeline stage:', stageError);
      throw new Error('Could not find a default pipeline stage.');
    }
    const defaultPipelineStageId = defaultStageData.id;


    // 4. Create the new lead
    const { data: newLeadData, error: leadInsertError } = await supabaseAdmin
      .from('leads')
      .insert({
        customer_id: customerId,
        pipeline_stage_id: defaultPipelineStageId, // Use the fetched default stage ID
        name: leadName, // Use customer name or a default
        // Add other default lead properties as needed
      })
      .select()
      .single();

    if (leadInsertError) throw leadInsertError;
    if (!newLeadData) throw new Error("Failed to create lead or retrieve its data.");

    console.log("New lead created:", newLeadData);
    const newLeadId = newLeadData.id;

    // 5. Update the conversation with the new lead_id
    const { error: convUpdateError } = await supabaseAdmin
      .from('conversations')
      .update({ lead_id: newLeadId })
      .eq('conversation_id', conversationId);

    if (convUpdateError) {
      // Attempt to roll back lead creation? Or log inconsistency?
      console.error(`Failed to link lead ${newLeadId} to conversation ${conversationId}:`, convUpdateError);
      // Return an error indicating partial success/failure
       return new Response(JSON.stringify({ error: 'Lead created but failed to link to conversation' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Successfully linked lead ${newLeadId} to conversation ${conversationId}`);

    // 6. Return the newly created lead data
    return new Response(JSON.stringify(newLeadData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in create-lead-from-conversation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
