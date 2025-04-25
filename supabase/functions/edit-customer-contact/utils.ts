/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../_shared/database.types.ts";

type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];
type CustomerResponse = Database["public"]["Tables"]["customers"]["Row"];

interface EditContactRequestPayload {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string; // Assuming 'company' maps to 'company_name' in DB
}

/**
 * Parses and validates the incoming request for editing a customer contact.
 * Checks for POST method, required 'id', and at least one field to update.
 *
 * @param req The incoming request object.
 * @returns The validated request payload.
 * @throws Error if validation fails.
 */
export async function parseAndValidateRequest(req: Request): Promise<EditContactRequestPayload> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<EditContactRequestPayload>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { id, name, email, phone, company } = body;

  if (!id) {
    throw new Error("Contact ID (id) is required"); // Caught for 400
  }
  if (name === undefined && email === undefined && phone === undefined && company === undefined) {
    throw new Error("At least one field (name, email, phone, company) must be provided for update"); // Caught for 400
  }

  // Return only the fields provided in the request
  return { id, name, email, phone, company };
}

/**
 * Prepares the data object for updating the customer record.
 * Only includes fields that were present in the request payload.
 * Maps 'company' to 'company_name' if necessary based on schema.
 * Adds an 'updated_at' timestamp.
 *
 * @param updates The validated update payload from the request.
 * @returns The data object ready for Supabase update.
 */
export function prepareUpdatePayload(updates: EditContactRequestPayload): CustomerUpdate {
  const updateData: CustomerUpdate = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  // Assuming the DB column is 'phone_number' based on other functions
  if (updates.phone !== undefined) updateData.phone_number = updates.phone;
  // Assuming the DB column is 'company_name' based on other functions
  if (updates.company !== undefined) updateData.company_name = updates.company;

  return updateData;
}

/**
 * Updates a customer record in the database.
 * Ensures the user owns the contact by matching user_id.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param customerId The ID of the customer to update.
 * @param userId The ID of the authenticated user.
 * @param updateData The prepared data object for the update.
 * @returns The result of the update operation { data, error }.
 */
export async function updateCustomerDb(
  supabase: SupabaseClient<Database>,
  customerId: string,
  userId: string,
  updateData: CustomerUpdate
): Promise<{ data: CustomerResponse | null; error: PostgrestError | { message: string } | null }> { // Adjusted return type

  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', customerId)
    .eq('user_id', userId) // Ensure user owns the contact (assuming user_id column exists)
    .select()
    .single(); // Return the updated record

  if (error) {
    console.error(`Error updating customer ${customerId}:`, error);
    // Specific error handling (like PGRST116) should be done in the main handler
  }
   if (!error && !data) {
     // This case might happen if RLS prevents the update but doesn't return an error explicitly,
     // or if the record matching both id and user_id wasn't found.
     console.warn(`Update for customer ${customerId} by user ${userId} affected 0 rows.`);
     // Return a simple error object matching the allowed type union
     return { data: null, error: { message: "Contact not found or update failed (possibly RLS)" } };
   }

  // If there was a database error, return it directly
  // If successful (data is not null), error is already null
  return { data, error };
}
