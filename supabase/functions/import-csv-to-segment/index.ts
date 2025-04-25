
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Updated to fully qualified URL
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import {
  parseAndValidateRequest,
  parseCsvData,
  findExistingContactsDb,
  categorizeCsvRows,
  insertNewContactsDb,
  linkContactsToSegmentDb,
  ImportCsvRequest,
  CsvRow,
  DuplicateInfo,
  CustomerInsert
} from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let supabaseClient; // Define client in outer scope for potential use in catch block if needed

  try {
    // 1. Parse and Validate Request
    const {
        csvData,
        segmentId,
        importMode,
        columnMapping,
        duplicateAction
    } = await parseAndValidateRequest(req);

    // 2. Create Authenticated Supabase Client & Verify User
    await getAuthenticatedUser(req); // Ensures user is authenticated
    supabaseClient = createSupabaseClient(req);

    // 3. Parse CSV Data
    const parsedCsvData: CsvRow[] = await parseCsvData(csvData, columnMapping);
    const phoneNumbers = parsedCsvData.map(row => row.phone_number).filter(Boolean);

    // 4. Find Existing Contacts
    const existingPhoneMap = await findExistingContactsDb(supabaseClient, phoneNumbers);

    // 5. Categorize CSV Rows
    const { newContactsData, duplicates } = categorizeCsvRows(parsedCsvData, existingPhoneMap);

    // 6. Determine Contacts to Process based on Mode/Action
    let contactsToInsert: CustomerInsert[] = [];
    const existingContactIdsToAdd: string[] = [];
    let duplicatesSkippedCount = 0;

    duplicates.forEach(dup => {
      if ((importMode === 'save_new' && duplicateAction === 'add') || importMode === 'existing_only') {
        existingContactIdsToAdd.push(dup.existingContactId);
      } else {
        duplicatesSkippedCount++;
      }
    });

    if (importMode === 'save_new') {
      contactsToInsert = newContactsData;
    }

    // 7. Insert New Contacts (if applicable)
    let newlyInsertedIds: string[] = [];
    if (contactsToInsert.length > 0) {
        newlyInsertedIds = await insertNewContactsDb(supabaseClient, contactsToInsert);
    }

    // 8. Link Contacts (New + Selected Duplicates) to Segment
    const finalContactIdsToLink = [...existingContactIdsToAdd, ...newlyInsertedIds];
    const linkError = await linkContactsToSegmentDb(supabaseClient, segmentId, finalContactIdsToLink);

    if (linkError) {
        // Handle potential RLS failure on segment ownership or other errors
        console.error("Error adding contacts to segment:", linkError);
        let status = 500;
        let message = "Failed to add contacts to segment";
        if (linkError.code === '23503') { // Foreign key violation likely means segment not found
            status = 404;
            message = "Target segment not found.";
        }
        // Note: New contacts might have been created even if linking fails.
        return new Response(JSON.stringify({ error: message }), {
            status: status, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // 9. Prepare and Return Summary Response
    const newContactsAddedCount = newlyInsertedIds.length;
    const duplicatesAddedCount = existingContactIdsToAdd.length;
    const totalAddedToSegment = finalContactIdsToLink.length;

    let message = "CSV import processed.";
     if (importMode === 'existing_only') {
       message = totalAddedToSegment > 0
         ? "CSV import processed. Only existing contacts were added to the segment."
         : "Import processed. No matching existing customers found in the CSV to add to the segment.";
     }

    return new Response(JSON.stringify({
      message: message,
      newContactsAdded: newContactsAddedCount,
      existingContactsAddedToSegment: duplicatesAddedCount,
      totalContactsAddedToSegment: totalAddedToSegment,
      duplicatesSkipped: duplicatesSkippedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    // Catch errors from parsing, auth, DB operations, or unexpected issues
    console.error("Error in import-csv-to-segment handler:", err.message);
    let status = 500;
    if (err.message === "Method Not Allowed") status = 405;
    else if (err.message === "Invalid JSON body") status = 400;
    else if (err.message.includes("are required")) status = 400; // Missing params
    else if (err.message.includes("Invalid importMode")) status = 400;
    else if (err.message.includes("Invalid duplicateAction")) status = 400;
    else if (err.message.startsWith("CSV Parsing Error")) status = 400;
    else if (err.message === "No data rows found in CSV.") status = 400;
    else if (err.message.startsWith("Authentication error") || err.message === "User not authenticated.") status = 401;
    else if (err.message === "Failed to check for existing contacts") status = 500;
    else if (err.message === "Failed to insert new contacts") status = 500;
    // Segment link errors are handled within the try block

    return new Response(JSON.stringify({ error: err.message }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
