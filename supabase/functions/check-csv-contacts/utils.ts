/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../_shared/database.types.ts";

type CustomerResponse = Pick<Database["public"]["Tables"]["customers"]["Row"], "id" | "phone_number">;

interface CheckContactsRequest {
  phoneNumbers: string[];
}

/**
 * Parses and validates the incoming request for checking contacts.
 * Checks for POST method and presence/structure of 'phoneNumbers' array.
 *
 * @param req The incoming request object.
 * @returns The validated array of phone numbers.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<string[]> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<CheckContactsRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { phoneNumbers } = body;

  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    throw new Error("Missing or invalid 'phoneNumbers' array in request body"); // Caught for 400
  }

  // Optional: Add validation for phone number format if needed

  return phoneNumbers;
}

/**
 * Finds existing customer records in the database based on a list of phone numbers.
 *
 * @param supabase The Supabase client instance (authenticated).
 * @param phoneNumbers An array of phone numbers to check.
 * @returns The result of the query { data, error }.
 */
export async function findExistingCustomersDb(
  supabase: SupabaseClient<Database>,
  phoneNumbers: string[]
): Promise<{ data: CustomerResponse[] | null; error: PostgrestError | null }> {
  if (phoneNumbers.length === 0) {
    return { data: [], error: null }; // Nothing to query
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, phone_number")
    .in("phone_number", phoneNumbers);

  if (error) {
    console.error("Error fetching existing customers in findExistingCustomersDb:", error);
    // Error will be handled by the main handler
  }

  return { data, error };
}

/**
 * Categorizes a list of input phone numbers based on whether they exist in the fetched customer data.
 *
 * @param inputNumbers The original array of phone numbers from the request.
 * @param existingCustomers The array of customer records fetched from the database, or null.
 * @returns An object containing arrays of existingCustomerIds and newPhoneNumbers.
 */
export function categorizePhoneNumbers(
  inputNumbers: string[],
  existingCustomers: CustomerResponse[] | null
): { existingCustomerIds: string[]; newPhoneNumbers: string[] } {
  const existingPhoneSet = new Set(existingCustomers?.map(c => c.phone_number) || []);
  const existingCustomerIds = existingCustomers?.map(c => c.id) || [];
  const newPhoneNumbers = inputNumbers.filter(num => !existingPhoneSet.has(num));

  return { existingCustomerIds, newPhoneNumbers };
}
