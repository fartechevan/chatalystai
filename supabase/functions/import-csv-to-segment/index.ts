import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.177.0/csv/mod.ts"; // CSV parsing
import { corsHeaders } from "../_shared/cors.ts";
import { Database } from "../_shared/database.types.ts";

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type SegmentContactInsert = Database["public"]["Tables"]["segment_contacts"]["Insert"];

// Define expected CSV headers (lowercase for case-insensitive matching)
const EXPECTED_PHONE_HEADER = "phone_number";
const OPTIONAL_NAME_HEADER = "name";

interface CsvRow {
  phone_number: string;
  name?: string;
  [key: string]: string | undefined; // Allow other columns
}

interface DuplicateInfo {
  csvRowIndex: number;
  csvData: CsvRow;
  existingContactId: string;
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

    // Parse multipart/form-data or JSON body
    // For simplicity, assuming JSON body with csvData and segmentId for now.
    // TODO: Adapt for actual file upload (multipart/form-data) later if needed.
    const { csvData, segmentId, importMode, columnMapping, duplicateAction } = await req.json() as {
        csvData: string; // Renamed from csvContent for clarity from frontend
        segmentId: string;
        importMode?: 'save_new' | 'existing_only'; // Added importMode
        columnMapping?: { [key: string]: string }; // e.g., { "Mobile": "phone_number", "Full Name": "name" }
        duplicateAction?: 'skip' | 'add'; // Action for duplicates identified *before* this call
    };

    if (!csvData || !segmentId) {
      return new Response(JSON.stringify({ error: "CSV data and Segment ID are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default importMode if not provided
    const effectiveImportMode = importMode || 'save_new';

    // Create Supabase client with auth context
    const supabaseClient = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
        auth: {
          persistSession: false,
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- CSV Parsing and Initial Processing ---
    let parsedData: CsvRow[];
    let headers: string[];
    try {
      const result = await parse(csvData, { skipFirstRow: true }); // Assuming header row
      const rawHeaders = await parse(csvData, { skipFirstRow: false, parse: (input) => input }); // Get headers
      if (!rawHeaders || rawHeaders.length === 0) throw new Error("CSV is empty or header row is missing.");
      headers = (rawHeaders[0] as string[]).map(h => h.trim().toLowerCase()); // Normalize headers

      // Basic validation: Check for phone number header
      const phoneHeaderIndex = headers.findIndex(h =>
        h === EXPECTED_PHONE_HEADER || (columnMapping && columnMapping[h] === EXPECTED_PHONE_HEADER)
      );
      if (phoneHeaderIndex === -1) {
         // TODO: Implement mapping request logic if phone header is missing/ambiguous
         return new Response(JSON.stringify({ error: `Required header '${EXPECTED_PHONE_HEADER}' not found or mapped.` }), {
           status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }

      parsedData = result.map((row, index): CsvRow => {
        const rowData: CsvRow = { phone_number: '' }; // Initialize with required field
        headers.forEach((header, i) => {
          const targetKey = columnMapping?.[header] || header; // Use mapping or original header
          if (targetKey === EXPECTED_PHONE_HEADER) {
            rowData.phone_number = (row[i] as string)?.trim() || '';
          } else if (targetKey === OPTIONAL_NAME_HEADER) {
            rowData.name = (row[i] as string)?.trim() || undefined;
          } else {
            // Store other columns as well
            rowData[header] = (row[i] as string)?.trim() || undefined;
          }
        });
         // Validate phone number presence for each row
        if (!rowData.phone_number) {
            throw new Error(`Missing phone number in CSV row ${index + 2}`); // +2 for header and 0-index
        }
        return rowData;
      });

    } catch (parseError) {
      console.error("CSV parsing error:", parseError);
      return new Response(JSON.stringify({ error: `CSV Parsing Error: ${parseError.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (parsedData.length === 0) {
         return new Response(JSON.stringify({ error: "No data rows found in CSV." }), {
           status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
    }

    // --- Duplicate Checking ---
    const phoneNumbers = parsedData.map(row => row.phone_number).filter(Boolean); // Get all valid phone numbers
    const { data: existingContacts, error: fetchError } = await supabaseClient
      .from("customers")
      .select("id, phone_number")
      .in("phone_number", phoneNumbers);

    if (fetchError) {
      console.error("Error fetching existing contacts:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to check for existing contacts" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const existingPhoneMap = new Map(existingContacts?.map(c => [c.phone_number, c.id]));
    const duplicates: DuplicateInfo[] = [];
    const newContactsData: CustomerInsert[] = [];
    const contactsToAddToSegment: { contact_id: string }[] = []; // Store IDs to add

    parsedData.forEach((row, index) => {
      const existingId = existingPhoneMap.get(row.phone_number);
      if (existingId) {
        // Found duplicate
        duplicates.push({ csvRowIndex: index + 2, csvData: row, existingContactId: existingId });
      } else {
        // New contact
        newContactsData.push({
          phone_number: row.phone_number,
          name: row.name || `Imported ${row.phone_number}`, // Default name if missing
          // TODO: Add user_id if your customers table requires it and is linked to auth.users
        });
      }
    });

    // --- Handling Based on Import Mode and Duplicate Action ---

    let insertedNewContactsCount = 0;
    let duplicatesAddedCount = 0;
    let duplicatesSkippedCount = 0;

    // Determine which existing contacts (duplicates) to add based on duplicateAction
    duplicates.forEach(dup => {
      // Only add duplicates if mode is 'save_new' AND action is 'add', OR if mode is 'existing_only'
      if ((effectiveImportMode === 'save_new' && duplicateAction === 'add') || effectiveImportMode === 'existing_only') {
        contactsToAddToSegment.push({ contact_id: dup.existingContactId });
        duplicatesAddedCount++;
      } else {
        duplicatesSkippedCount++; // Skipped if mode is 'save_new' and action is 'skip'
      }
    });

    // --- Insert New Contacts (only if mode is 'save_new') ---
    if (effectiveImportMode === 'save_new' && newContactsData.length > 0) {
      const { data: insertedData, error: insertError } = await supabaseClient
        .from("customers")
        .insert(newContactsData)
        .select("id"); // Select only the ID

      if (insertError) {
        console.error("Error inserting new contacts:", insertError);
        // Consider if partial success should be handled or rollback needed
        return new Response(JSON.stringify({ error: "Failed to insert new contacts" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const newlyInserted = insertedData || [];
      insertedNewContactsCount = newlyInserted.length;

      // Add newly inserted contact IDs to the list for segment linking
      newlyInserted.forEach(newContact => {
        contactsToAddToSegment.push({ contact_id: newContact.id });
      });
    }
    // If mode is 'existing_only', newContactsData is ignored, and insertedNewContactsCount remains 0.


    // --- Add Contacts to Segment ---
    // contactsToAddToSegment now contains the correct IDs based on importMode and duplicateAction
    if (contactsToAddToSegment.length > 0) {
        const segmentInserts: SegmentContactInsert[] = contactsToAddToSegment.map(c => ({
            segment_id: segmentId,
            contact_id: c.contact_id,
        }));

        // RLS on segment_contacts checks segment ownership
        const { error: segmentInsertError } = await supabaseClient
            .from("segment_contacts")
            .upsert(segmentInserts, { onConflict: 'segment_id, contact_id', ignoreDuplicates: true }); // Ignore if already in segment

        if (segmentInsertError) {
             // Handle potential RLS failure on segment ownership or other errors
             console.error("Error adding contacts to segment:", segmentInsertError);
             // Check for foreign key violation (segment_id invalid) or RLS
             if (segmentInsertError.code === '23503') {
                 return new Response(JSON.stringify({ error: "Target segment not found." }), {
                     status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
                 });
             }
             return new Response(JSON.stringify({ error: "Failed to add contacts to segment" }), {
                 status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
             });
        }
    }

    // --- Final Response ---
    let message = "CSV import processed.";
    if (effectiveImportMode === 'existing_only') {
      if (contactsToAddToSegment.length === 0) {
        message = "Import processed. No matching existing customers found in the CSV to add to the segment.";
      } else {
        message = "CSV import processed. Only existing contacts were added to the segment.";
      }
    } else {
      // Message for 'save_new' mode remains the same
      message = "CSV import processed.";
    }


    return new Response(JSON.stringify({
      message: message,
      newContactsAdded: insertedNewContactsCount,
      existingContactsAddedToSegment: duplicatesAddedCount, // Renamed for clarity
      totalContactsAddedToSegment: contactsToAddToSegment.length,
      duplicatesSkipped: duplicatesSkippedCount, // More accurate count
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Internal server error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
