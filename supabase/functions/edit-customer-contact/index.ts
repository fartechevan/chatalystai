import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Edit Customer Contact function started');

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the request body
    const { id, name, email, phone, company } = await req.json();

    // Validate required fields
    if (!id) {
      return new Response(JSON.stringify({ error: 'Contact ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
     if (!name && !email && !phone && !company) {
      return new Response(JSON.stringify({ error: 'At least one field (name, email, phone, company) must be provided for update' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

     // Get the authenticated user
     const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
     if (userError || !user) {
       console.error('User not authenticated:', userError?.message);
       return new Response(JSON.stringify({ error: 'User not authenticated' }), {
         status: 401,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
     console.log('Authenticated user:', user.id);


    // Prepare the update object, only including fields that are provided
    const updateData: { name?: string; email?: string; phone?: string; company?: string, updated_at: string } = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;


    // Update the customer record
    const { data, error } = await supabaseClient
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure the user owns the contact
      .select()
      .single(); // Use single() if you expect only one record to be updated and want it returned

    if (error) {
      console.error('Error updating customer:', error);
      // Check for specific errors, e.g., RLS violation or record not found
       if (error.code === 'PGRST116') { // PostgREST error code for "No rows found"
        return new Response(JSON.stringify({ error: 'Contact not found or user does not have permission to edit' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update contact', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

     if (!data) {
       console.error('No data returned after update, possibly RLS issue or contact not found.');
       return new Response(JSON.stringify({ error: 'Contact not found or update failed' }), {
         status: 404, // Or 500 depending on expected behavior
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }

    console.log('Customer updated successfully:', data);

    // Return the updated customer data
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
