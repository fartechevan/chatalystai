
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerResponse = Pick<Database["public"]["Tables"]["customers"]["Row"], "id">; // Only need ID back

interface NewContactPayload {
  phone_number: string;
  name?: string; // Optional name
}

interface AddNewCustomersRequest {
  newContacts: NewContactPayload[];
}

/**
 * Parses and validates the incoming request for adding new customers.
 * Checks for POST method, presence and structure of 'newContacts' array,
 * and validates each contact has a phone_number.
 *
 * @param req The incoming request object.
 * @returns The prepared array of CustomerInsert objects.
 * @throws Error if validation fails.
 */
export async function parseAndValidateRequest(req: Request): Promise<CustomerInsert[]> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<AddNewCustomersRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { newContacts } = body;

  if (!newContacts || !Array.isArray(newContacts) || newContacts.length === 0) {
    throw new Error("Missing or invalid 'newContacts' array in request body"); // Caught for 400
  }

  const contactsToInsert: CustomerInsert[] = [];
  for (const [index, contact] of newContacts.entries()) {
    if (!contact.phone_number || typeof contact.phone_number !== 'string' || contact.phone_number.trim() === '') {
      // Throw immediately on first invalid contact
      throw new Error(`Invalid contact data at index ${index}: phone_number is required.`); // Caught for 400
    }
    // Prepare data for insertion
    contactsToInsert.push({
      phone_number: contact.phone_number.trim(),
      name: contact.name?.trim() || '', // Use empty string if name is missing/empty
      // Add other required fields with defaults if necessary, e.g., user_id if applicable
      // user_id: userId, // Assuming userId is available if needed
    });
  }

  return contactsToInsert;
}

/**
 * Inserts new customer records into the database.
 * Handles potential unique constraint violations (e.g., duplicate phone numbers).
 *
 * @param supabase The Supabase client instance (authenticated or service role depending on RLS).
 * @param contacts The array of CustomerInsert objects to insert.
 * @returns The result of the insert operation { data, error }.
 */
export async function addNewCustomersDb(
  supabase: SupabaseClient<Database>,
  contacts: CustomerInsert[]
): Promise<{ data: CustomerResponse[] | null; error: PostgrestError | null }> {
  if (contacts.length === 0) {
    return { data: [], error: null }; // Nothing to insert
  }

  // Use insert. Upsert might be better if phone_number is unique and you want to ignore duplicates.
  // Assuming insert for now, handling unique violation below.
  const { data, error } = await supabase
    .from("customers")
    .insert(contacts)
    .select("id"); // Select only the IDs of newly inserted rows

  if (error) {
    console.error("Error inserting new customers in addNewCustomersDb:", error);
    // Specific error handling can be done here or in the main handler
  }

  return { data, error };
}
