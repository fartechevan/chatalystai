// Use imports based on import_map.json
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database } from "../_shared/database.types.ts"; // Use type import

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];

interface NewContact {
  phone_number: string;
  name?: string; // Optional name
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON body
    const { newContacts } = await req.json() as { newContacts?: NewContact[] };

    if (!newContacts || !Array.isArray(newContacts) || newContacts.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'newContacts' array in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input data
    const contactsToInsert: CustomerInsert[] = [];
    for (const contact of newContacts) {
      if (!contact.phone_number || typeof contact.phone_number !== 'string') {
        // Log the invalid contact for debugging if needed
        console.warn("Skipping invalid contact data:", contact);
        // Return an error response immediately
        return new Response(JSON.stringify({ error: `Invalid contact data: phone_number is required for entry with name '${contact.name || 'N/A'}'.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        // Note: The 'continue' below is now unreachable due to the return,
        // but kept for clarity if the return is removed for batch error handling.
        // continue; // Skip this contact if phone_number is invalid
      }
      // Push the valid contact data, using '' for missing names
      contactsToInsert.push({
        phone_number: contact.phone_number.trim(),
        name: contact.name?.trim() || '', // Use empty string instead of null/default
        // Add other required fields for 'customers' table if necessary, e.g., user_id
      });
    } // <-- Closing brace for the for...of loop

    // Create Supabase client with auth context
    const supabaseClient = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
        auth: { persistSession: false },
      }
    );

    // Get the authenticated user (optional, but good practice)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Insert New Customers ---
    // Use upsert with ignoreDuplicates based on phone_number if it has a unique constraint
    // Otherwise, use insert. Assuming insert for now.
    const { data: insertedData, error: insertError } = await supabaseClient
      .from("customers")
      .insert(contactsToInsert)
      .select("id"); // Select IDs of newly inserted rows

    if (insertError) {
      console.error("Error inserting new customers:", insertError);
      // Handle potential unique constraint violation if not using upsert
      if (insertError.code === '23505') { // Unique violation code
         return new Response(JSON.stringify({ error: "One or more phone numbers already exist." }), {
           status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }
      return new Response(JSON.stringify({ error: "Failed to insert new customers" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Return Result ---
    // Rename addedCustomerIds to newCustomerIds to match frontend expectation
    return new Response(JSON.stringify({
      message: `${insertedData?.length || 0} new customers added successfully.`,
      addedCount: insertedData?.length || 0,
      newCustomerIds: insertedData?.map(c => c.id) || [], // Renamed key
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Use 200 OK or 201 Created
    });

  } catch (err) {
    console.error("Internal server error:", err);
    return new Response(JSON.stringify({ error: err.message || "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } // <-- Ensure this closing brace for the main try block is present
}); // <-- Ensure this closing brace for the serve function is present
