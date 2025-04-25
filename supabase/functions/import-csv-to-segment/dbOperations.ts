
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";
import { CustomerInsert, DuplicateInfo } from "./types.ts";

/**
 * Finds existing customer records based on phone numbers.
 *
 * @param supabase Supabase client instance.
 * @param phoneNumbers Array of phone numbers to check.
 * @returns A Map where keys are phone numbers and values are existing customer IDs.
 * @throws Error on database query failure.
 */
export async function findExistingContactsDb(
    supabase: SupabaseClient<Database>,
    phoneNumbers: string[]
): Promise<Map<string, string>> {
    if (phoneNumbers.length === 0) return new Map();

    const { data: existingContacts, error: fetchError } = await supabase
        .from("customers")
        .select("id, phone_number")
        .in("phone_number", phoneNumbers);

    if (fetchError) {
        console.error("Error fetching existing contacts:", fetchError);
        throw new Error("Failed to check for existing contacts");
    }

    return new Map(existingContacts?.map(c => [c.phone_number, c.id]) || []);
}

/**
 * Categorizes CSV rows into new contacts and duplicates based on existing contacts.
 *
 * @param parsedData Array of parsed CsvRow objects.
 * @param existingPhoneMap Map of existing phone numbers to customer IDs.
 * @returns Object containing arrays of newContactsData and duplicates info.
 */
export function categorizeCsvRows(
    parsedData: CsvRow[],
    existingPhoneMap: Map<string, string>
): { newContactsData: CustomerInsert[]; duplicates: DuplicateInfo[] } {
    const duplicates: DuplicateInfo[] = [];
    const newContactsData: CustomerInsert[] = [];

    parsedData.forEach((row, index) => {
        const existingId = existingPhoneMap.get(row.phone_number);
        if (existingId) {
            duplicates.push({ csvRowIndex: index + 2, csvData: row, existingContactId: existingId });
        } else {
            newContactsData.push({
                phone_number: row.phone_number,
                name: row.name || `Imported ${row.phone_number}`, // Default name
            });
        }
    });
    return { newContactsData, duplicates };
}

/**
 * Inserts new customer records into the database.
 *
 * @param supabase Supabase client instance.
 * @param contactsToInsert Array of CustomerInsert objects.
 * @returns Array of IDs of the newly inserted customers.
 * @throws Error on database insert failure.
 */
export async function insertNewContactsDb(
    supabase: SupabaseClient<Database>,
    contactsToInsert: CustomerInsert[]
): Promise<string[]> {
    if (contactsToInsert.length === 0) return [];

    const { data: insertedData, error: insertError } = await supabase
        .from("customers")
        .insert(contactsToInsert)
        .select("id");

    if (insertError) {
        console.error("Error inserting new contacts:", insertError);
        throw new Error("Failed to insert new contacts");
    }
    return (insertedData || []).map(c => c.id);
}

/**
 * Adds contact IDs to a specified segment using upsert to ignore duplicates.
 *
 * @param supabase Supabase client instance.
 * @param segmentId The ID of the target segment.
 * @param contactIds Array of contact IDs to add.
 * @returns PostgrestError if the operation fails, otherwise null.
 */
export async function linkContactsToSegmentDb(
    supabase: SupabaseClient<Database>,
    segmentId: string,
    contactIds: string[]
): Promise<PostgrestError | null> {
    if (contactIds.length === 0) return null;

    const segmentInserts = contactIds.map(contact_id => ({
        segment_id: segmentId,
        contact_id: contact_id,
    }));

    const { error } = await supabase
        .from("segment_contacts")
        .upsert(segmentInserts, { onConflict: 'segment_id, contact_id', ignoreDuplicates: true });

    if (error) {
        console.error("Error adding contacts to segment:", error);
    }
    return error;
}
