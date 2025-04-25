// Use imports based on import_map.json
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming cors.ts is correctly located
import type { Database } from "../_shared/database.types.ts";

type Segment = Database['public']['Tables']['segments']['Row'];
type SegmentContact = Database['public']['Tables']['segment_contacts']['Row'];

console.log("Function 'create-segment-from-contacts' starting up...");

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure environment variables are available
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    // Create Supabase client with service role privileges
    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);

    // Parse request body
    const { segmentName, customerIds, userId } = await req.json(); // Add userId

    // --- Input Validation ---
    if (!segmentName || typeof segmentName !== 'string' || segmentName.trim() === '') {
      return new Response(JSON.stringify({ error: 'Segment name is required and must be a non-empty string.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Customer IDs must be provided as a non-empty array.' }), {
        status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
     if (!userId || typeof userId !== 'string') { // Validate userId
       return new Response(JSON.stringify({ error: 'User ID is required.' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
     // Optional: Add more validation for customerIds (e.g., check if they are valid UUIDs)

     console.log(`Received request to create segment "${segmentName}" for user ${userId} with ${customerIds.length} contacts.`);

    // --- Database Operations ---
     // 1. Create the segment
     const { data: newSegment, error: segmentError } = await supabaseAdmin
       .from('segments')
       .insert({ name: segmentName.trim(), user_id: userId }) // Include user_id
       .select()
       .single(); // Use .single() to get the created object directly

    if (segmentError) {
      console.error("Error creating segment:", segmentError);
      // Handle potential duplicate name error (check error code/message if needed)
      if (segmentError.code === '23505') { // Unique violation
         return new Response(JSON.stringify({ error: `Segment name "${segmentName.trim()}" already exists.` }), {
           status: 409, // Conflict
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }
      throw new Error(`Failed to create segment: ${segmentError.message}`);
    }

    if (!newSegment) {
       throw new Error("Segment creation did not return data.");
    }

    console.log(`Segment created with ID: ${newSegment.id}`);

    // 2. Prepare contacts for the segment_contacts table
    // Corrected 'customer_id' to 'contact_id' based on the type error and assuming schema
    const segmentContactsData: Omit<SegmentContact, 'id' | 'added_at'>[] = customerIds.map(customerId => ({
      segment_id: newSegment.id,
      contact_id: customerId, // Corrected field name
    }));

    // 3. Insert into segment_contacts
    const { error: contactsError } = await supabaseAdmin
      .from('segment_contacts')
      .insert(segmentContactsData);

    if (contactsError) {
      console.error("Error adding contacts to segment:", contactsError);
      // Attempt to clean up the created segment if contacts fail? (More complex transaction logic needed for true atomicity)
      // For simplicity now, we'll just report the error.
      // Consider deleting the segment if contacts fail:
      // await supabaseAdmin.from('segments').delete().match({ id: newSegment.id });
      throw new Error(`Failed to add contacts to segment: ${contactsError.message}`);
    }

    console.log(`${segmentContactsData.length} contacts added to segment ${newSegment.id}`);

    // --- Return Success Response ---
    return new Response(JSON.stringify(newSegment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    console.error("Error in create-segment-from-contacts function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
