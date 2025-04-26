import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'; // Using consistent version
import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { parse as parseCsv } from "https://deno.land/x/csv@v0.9.2/mod.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
import { Database } from "../_shared/database.types.ts";

// --- Type Definitions (Combined & Renamed) ---

type Segment = Database["public"]["Tables"]["segments"]["Row"];
type SegmentInsert = Database["public"]["Tables"]["segments"]["Insert"];
type SegmentContact = Database["public"]["Tables"]["segment_contacts"]["Row"];
type SegmentContactInsert = Database["public"]["Tables"]["segment_contacts"]["Insert"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerInfo = Pick<Customer, "id" | "name" | "phone_number" | "email">;
type SegmentInfo = Pick<Segment, "id" | "name" | "created_at">;

// For listSegmentContactsDb response
interface SegmentContactWithCustomer {
  segment_id: string;
  added_at: string;
  customers: CustomerInfo | null;
}

// For CSV Import
interface CsvRow {
  phone_number: string;
  name?: string;
  [key: string]: string | undefined;
}
interface ImportCsvRequestPayload {
  csvData: string;
  segmentId: string;
  importMode?: 'save_new' | 'existing_only';
  columnMapping?: { [key: string]: string };
  duplicateAction?: 'skip' | 'add';
}
interface DuplicateInfo {
  csvRowIndex: number;
  csvData: CsvRow;
  existingContactId: string;
}

// For Create Segment from Contacts
interface CreateSegmentFromContactsRequestPayload {
  segmentName: string;
  customerIds: string[];
  userId: string; // Required when using Service Role client
}

// --- Helper Functions ---

function createJsonResponse(body: unknown, status: number = 200) {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = { ...corsHeaders };
  if (status !== 204) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(responseBody, { status, headers });
}

// --- Utility Functions (Adapted from individual utils.ts) ---

// --- List Segments Utils ---
function validateListSegmentsRequest(req: Request): void {
  if (req.method !== "GET") throw new Error("Method Not Allowed");
}
async function listSegmentsDb(supabase: SupabaseClient<Database>, userId: string): Promise<{ data: SegmentInfo[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("segments")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

// --- Create Segment Utils ---
async function parseCreateSegmentRequest(req: Request): Promise<{ name: string }> {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  let body: Partial<{ name: string }>;
  try { body = await req.json(); } catch (e) { throw new Error("Invalid JSON body"); }
  const { name } = body;
  if (!name || typeof name !== "string" || name.trim() === "") throw new Error("Segment name is required");
  return { name: name.trim() };
}
async function createSegmentDb(supabase: SupabaseClient<Database>, name: string, userId: string): Promise<{ data: Segment | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("segments")
    .insert({ name: name, user_id: userId })
    .select()
    .single();
  return { data, error };
}

// --- Delete Segment Utils ---
function parseDeleteSegmentRequest(req: Request, pathSegments: string[]): { segmentId: string } {
  if (req.method !== "DELETE") throw new Error("Method Not Allowed");
  // Assumes path like /segments/{segmentId} -> segmentId is the last segment
  const segmentId = pathSegments[pathSegments.length - 1];
  if (!segmentId) throw new Error("Segment ID is required in the URL path");
  return { segmentId };
}
async function deleteSegmentDb(supabase: SupabaseClient<Database>, segmentId: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from("segments").delete().eq("id", segmentId);
  return { error };
}

// --- List Segment Contacts Utils ---
function parseListSegmentContactsRequest(req: Request, pathSegments: string[]): { segmentId: string } {
    if (req.method !== "GET") throw new Error("Method Not Allowed");
    // Assumes path like /segments/{segmentId}/contacts -> segmentId is second to last
    const segmentId = pathSegments[pathSegments.length - 2];
    if (!segmentId) throw new Error("Segment ID is required in the URL path");
    return { segmentId };
}
async function listSegmentContactsDb(supabase: SupabaseClient<Database>, segmentId: string): Promise<{ data: SegmentContactWithCustomer[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("segment_contacts")
    .select(`segment_id, added_at, customers ( id, name, phone_number, email )`)
    .eq("segment_id", segmentId);
  return { data, error };
}
function formatListSegmentContactsResponse(rawData: SegmentContactWithCustomer[] | null): CustomerInfo[] {
  if (!rawData) return [];
  return rawData.map(item => item.customers).filter((customer): customer is CustomerInfo => customer !== null);
}

// --- Add Contact to Segment Utils ---
async function parseAddContactRequest(req: Request, pathSegments: string[]): Promise<{ segmentId: string; contactId: string }> {
    if (req.method !== "POST") throw new Error("Method Not Allowed");
    // Assumes path like /segments/{segmentId}/contacts
    const segmentId = pathSegments[pathSegments.length - 2];
    if (!segmentId) throw new Error("Segment ID is required in the URL path");
    let body: Partial<{ contact_id: string }>;
    try { body = await req.json(); } catch (e) { throw new Error("Invalid JSON body"); }
    const { contact_id } = body;
    if (!contact_id) throw new Error("Contact ID (contact_id) is required in the request body");
    return { segmentId, contactId: contact_id };
}
async function addContactToSegmentDb(supabase: SupabaseClient<Database>, segmentId: string, contactId: string): Promise<{ data: SegmentContact | null; error: PostgrestError | { message: string } | null; status: number }> {
  const { data, error, status } = await supabase
    .from("segment_contacts")
    .upsert({ segment_id: segmentId, contact_id: contactId }, { onConflict: 'segment_id, contact_id', ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === '23503') return { data: null, error: { message: "Segment or Contact not found" }, status: 404 };
    return { data: null, error: { message: error.message || "Database error" }, status: 500 };
  }
  return { data, error: null, status: data ? 201 : 200 }; // 201 if created/ensured
}

// --- Remove Contact from Segment Utils ---
function parseRemoveContactRequest(req: Request, pathSegments: string[]): { segmentId: string; contactId: string } {
    if (req.method !== "DELETE") throw new Error("Method Not Allowed");
    // Assumes path like /segments/{segmentId}/contacts/{contactId}
    const contactId = pathSegments[pathSegments.length - 1];
    const segmentId = pathSegments[pathSegments.length - 3]; // Check index carefully
    if (!segmentId || !contactId) {
        throw new Error("Segment ID and Contact ID are required in the URL path (e.g., /segments/{segId}/contacts/{contactId})");
    }
    return { segmentId, contactId };
}
async function removeContactFromSegmentDb(supabase: SupabaseClient<Database>, segmentId: string, contactId: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("segment_contacts")
    .delete()
    .match({ segment_id: segmentId, contact_id: contactId });
  return { error };
}

// --- Create Segment From Contacts Utils ---
async function parseCreateSegmentFromContactsRequest(req: Request): Promise<CreateSegmentFromContactsRequestPayload> {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  let body: Partial<CreateSegmentFromContactsRequestPayload>;
  try { body = await req.json(); } catch (e) { throw new Error("Invalid JSON body"); }
  const { segmentName, customerIds, userId } = body;
  if (!segmentName || typeof segmentName !== 'string' || segmentName.trim() === '') throw new Error('Segment name is required and must be a non-empty string.');
  if (!Array.isArray(customerIds) || customerIds.length === 0) throw new Error('Customer IDs must be provided as a non-empty array.');
  if (!userId || typeof userId !== 'string') throw new Error('User ID is required.'); // Needed for createSegmentDb call
  return { segmentName: segmentName.trim(), customerIds, userId };
}
// Uses createSegmentDb (defined above)
async function addContactsToSegmentDb(supabase: SupabaseClient<Database>, segmentId: string, contactIds: string[]): Promise<{ error: PostgrestError | null }> {
   if (contactIds.length === 0) return { error: null };
   const segmentContactsData: Omit<SegmentContact, 'id' | 'added_at'>[] = contactIds.map(contactId => ({
     segment_id: segmentId,
     contact_id: contactId,
   }));
   const { error } = await supabase.from('segment_contacts').insert(segmentContactsData); // Consider upsert
   return { error };
}

// --- Import CSV Utils ---
async function parseImportCsvRequest(req: Request): Promise<ImportCsvRequestPayload> {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  let body: Partial<ImportCsvRequestPayload>;
  try { body = await req.json(); } catch (e) { throw new Error("Invalid JSON body"); }
  const { csvData, segmentId, importMode, columnMapping, duplicateAction } = body;
  if (!csvData || !segmentId) throw new Error("CSV data (csvData) and Segment ID (segmentId) are required");
  if (importMode && !['save_new', 'existing_only'].includes(importMode)) throw new Error("Invalid importMode. Must be 'save_new' or 'existing_only'.");
  if (duplicateAction && !['skip', 'add'].includes(duplicateAction)) throw new Error("Invalid duplicateAction. Must be 'skip' or 'add'.");
  return { csvData, segmentId, importMode: importMode || 'save_new', columnMapping, duplicateAction: duplicateAction || 'skip' };
}
async function parseCsvUtil(csvString: string, columnMapping?: { [key: string]: string }): Promise<CsvRow[]> {
    const EXPECTED_PHONE_HEADER = "phone_number";
    const OPTIONAL_NAME_HEADER = "name";
    let parsedData: CsvRow[];
    let headers: string[];
    try {
        const result = await parseCsv(csvString, { skipFirstRow: true });
        const rawHeaders = await parseCsv(csvString, { skipFirstRow: false, parse: (input) => input });
        if (!rawHeaders || rawHeaders.length === 0) throw new Error("CSV is empty or header row is missing.");
        headers = (rawHeaders[0] as string[]).map(h => h.trim().toLowerCase());
        const phoneHeader = headers.find(h => h === EXPECTED_PHONE_HEADER || (columnMapping && columnMapping[h] === EXPECTED_PHONE_HEADER));
        if (!phoneHeader) throw new Error(`Required header '${EXPECTED_PHONE_HEADER}' not found or mapped.`);
        parsedData = result.map((row, index): CsvRow => {
            const rowData: CsvRow = { phone_number: '' };
            headers.forEach((header, i) => {
                const csvValue = (row[i] as string)?.trim() || '';
                const targetKey = columnMapping?.[header] || header;
                if (targetKey === EXPECTED_PHONE_HEADER) rowData.phone_number = csvValue;
                else if (targetKey === OPTIONAL_NAME_HEADER) rowData.name = csvValue || undefined;
                else rowData[header] = csvValue || undefined;
            });
            if (!rowData.phone_number) throw new Error(`Missing phone number in CSV row ${index + 2}`);
            return rowData;
        });
    } catch (parseError) { throw new Error(`CSV Parsing Error: ${parseError.message}`); }
    if (parsedData.length === 0) throw new Error("No data rows found in CSV.");
    return parsedData;
}
async function findExistingContactsDb(supabase: SupabaseClient<Database>, phoneNumbers: string[]): Promise<Map<string, string>> {
    if (phoneNumbers.length === 0) return new Map();
    const { data: existingContacts, error: fetchError } = await supabase
        .from("customers").select("id, phone_number").in("phone_number", phoneNumbers);
    if (fetchError) throw new Error("Failed to check for existing contacts");
    return new Map(existingContacts?.map(c => [c.phone_number, c.id]) || []);
}
function categorizeCsvRows(parsedData: CsvRow[], existingPhoneMap: Map<string, string>): { newContactsData: CustomerInsert[]; duplicates: DuplicateInfo[] } {
    const duplicates: DuplicateInfo[] = [];
    const newContactsData: CustomerInsert[] = [];
    parsedData.forEach((row, index) => {
        const existingId = existingPhoneMap.get(row.phone_number);
        if (existingId) duplicates.push({ csvRowIndex: index + 2, csvData: row, existingContactId: existingId });
        else newContactsData.push({ phone_number: row.phone_number, name: row.name || `Imported ${row.phone_number}` });
    });
    return { newContactsData, duplicates };
}
async function insertNewContactsDb(supabase: SupabaseClient<Database>, contactsToInsert: CustomerInsert[]): Promise<string[]> {
    if (contactsToInsert.length === 0) return [];
    const { data: insertedData, error: insertError } = await supabase
        .from("customers").insert(contactsToInsert).select("id");
    if (insertError) throw new Error("Failed to insert new contacts");
    return (insertedData || []).map(c => c.id);
}
// Uses addContactsToSegmentDb (defined above)


// --- Main Handler ---

serve(async (req: Request) => {
  // Immediately handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  let user;
  let supabaseClient;

  try {
    // --- Authentication ---
    user = await getAuthenticatedUser(req); // Throws on error
    supabaseClient = createSupabaseClient(req); // Create client after auth
    console.log(`[${requestStartTime}] Authenticated user: ${user.id}`);

    // --- Routing Logic ---
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean); // e.g., ['functions', 'v1', 'segment-handler', 'segments', 'segId', 'contacts', 'contactId']
    const handlerIndex = pathSegments.indexOf('segment-handler');
    const routeSegments = handlerIndex !== -1 ? pathSegments.slice(handlerIndex + 1) : []; // e.g., ['segments', 'segId', 'contacts', 'contactId']

    console.log(`[${requestStartTime}] Handling ${req.method} for route segments: ${routeSegments.join('/')}`);

    // --- Main Routing based on path segments ---

    // Base path: /segments
    if (routeSegments[0] === 'segments') {

      // Path: /segments
      if (routeSegments.length === 1) {
        // GET /segments -> List Segments
        if (req.method === 'GET') {
          console.log(`[${requestStartTime}] Routing to: List Segments`);
        validateListSegmentsRequest(req); // Basic method check
        const { data, error } = await listSegmentsDb(supabaseClient, user.id);
        if (error) {
          console.error(`[${requestStartTime}] List Segments DB Error:`, error.message);
          return createJsonResponse({ error: error.message || "Failed to list segments" }, 500);
        }
          return createJsonResponse(data ?? [], 200);
        }
        // POST /segments -> Create Segment
        else if (req.method === 'POST') {
          console.log(`[${requestStartTime}] Routing to: Create Segment`);
        const { name } = await parseCreateSegmentRequest(req);
        const { data, error } = await createSegmentDb(supabaseClient, name, user.id);
        if (error) {
          console.error(`[${requestStartTime}] Create Segment DB Error:`, error.message);
          return createJsonResponse({ error: error.message || "Failed to create segment" }, 500); // Add 409 check?
        }
          return createJsonResponse(data, 201);
        }
      } // End /segments (length 1)

      // Path: /segments/{segmentId} or /segments/from-contacts or /segments/import-csv
      else if (routeSegments.length === 2) {
        // DELETE /segments/{segmentId} -> Delete Segment
        if (req.method === 'DELETE' && routeSegments[1] !== 'from-contacts' && routeSegments[1] !== 'import-csv') {
           console.log(`[${requestStartTime}] Routing to: Delete Segment`);
        const { segmentId } = parseDeleteSegmentRequest(req, routeSegments);
        const { error } = await deleteSegmentDb(supabaseClient, segmentId);
        if (error) {
          console.error(`[${requestStartTime}] Delete Segment DB Error (ID: ${segmentId}):`, error.message);
          const status = error.code === 'PGRST116' ? 404 : 500;
          const message = status === 404 ? "Segment not found or access denied" : "Failed to delete segment";
          return createJsonResponse({ error: message }, status);
        }
           return createJsonResponse(null, 204);
        }
        // POST /segments/from-contacts -> Create Segment From Contacts
        else if (req.method === 'POST' && routeSegments[1] === 'from-contacts') {
            console.log(`[${requestStartTime}] Routing to: Create Segment From Contacts`);
            const { segmentName, customerIds, userId: requestUserId } = await parseCreateSegmentFromContactsRequest(req);
            // Security check: Ensure the userId in the payload matches the authenticated user
            if (requestUserId !== user.id) {
                console.warn(`[${requestStartTime}] Create Segment From Contacts Auth Mismatch: Payload user ${requestUserId} != Auth user ${user.id}`);
                return createJsonResponse({ error: "User ID mismatch" }, 403); // Forbidden
            }
            // Create segment
            const { data: segmentData, error: segmentError } = await createSegmentDb(supabaseClient, segmentName, user.id);
            if (segmentError || !segmentData) {
                console.error(`[${requestStartTime}] Create Segment From Contacts - Segment Creation Error:`, segmentError?.message);
                return createJsonResponse({ error: segmentError?.message || "Failed to create segment" }, 500);
            }
            // Add contacts
            const { error: addError } = await addContactsToSegmentDb(supabaseClient, segmentData.id, customerIds);
            if (addError) {
                // Check if addError has a message property before accessing it
                const errorMessage = (addError && typeof addError === 'object' && 'message' in addError) ? addError.message : 'Unknown error';
                console.error(`[${requestStartTime}] Create Segment From Contacts - Add Contacts Error (SegID: ${segmentData.id}):`, errorMessage);
                return createJsonResponse({ error: "Segment created but failed to add some contacts: " + errorMessage, segmentId: segmentData.id }, 500);
            }
            return createJsonResponse(segmentData, 201);
        }
        // POST /segments/import-csv -> Import CSV to Segment
        else if (req.method === 'POST' && routeSegments[1] === 'import-csv') {
            console.log(`[${requestStartTime}] Routing to: Import CSV to Segment`);
            const { csvData, segmentId, importMode, columnMapping, duplicateAction } = await parseImportCsvRequest(req);
            const parsedCsvData = await parseCsvUtil(csvData, columnMapping);
            const phoneNumbers = parsedCsvData.map(row => row.phone_number).filter(Boolean);
            const existingPhoneMap = await findExistingContactsDb(supabaseClient, phoneNumbers);
            const { newContactsData, duplicates } = categorizeCsvRows(parsedCsvData, existingPhoneMap);

            let contactsToInsert: CustomerInsert[] = [];
            const existingContactIdsToAdd: string[] = [];
            let duplicatesSkippedCount = 0;

            duplicates.forEach(dup => {
                if ((importMode === 'save_new' && duplicateAction === 'add') || importMode === 'existing_only') {
                    existingContactIdsToAdd.push(dup.existingContactId);
                } else { duplicatesSkippedCount++; }
            });
            if (importMode === 'save_new') contactsToInsert = newContactsData;

            let newlyInsertedIds: string[] = [];
            if (contactsToInsert.length > 0) {
                newlyInsertedIds = await insertNewContactsDb(supabaseClient, contactsToInsert);
            }

            const finalContactIdsToLink = [...existingContactIdsToAdd, ...newlyInsertedIds];
            const linkError = await addContactsToSegmentDb(supabaseClient, segmentId, finalContactIdsToLink); // Reusing addContactsToSegmentDb

            if (linkError) {
                 // Check if linkError has message and code properties before accessing
                const errorMessage = (linkError && typeof linkError === 'object' && 'message' in linkError) ? linkError.message : 'Unknown link error';
                const errorCode = (linkError && typeof linkError === 'object' && 'code' in linkError) ? linkError.code : null;
                console.error(`[${requestStartTime}] Import CSV - Link Contacts Error (SegID: ${segmentId}):`, errorMessage);
                let status = 500; let message = "Failed to add contacts to segment";
                if (errorCode && errorCode === '23503') { status = 404; message = "Target segment not found."; }
                return createJsonResponse({ error: message }, status);
            }

            const newContactsAddedCount = newlyInsertedIds.length;
            const duplicatesAddedCount = existingContactIdsToAdd.length;
            const totalAddedToSegment = finalContactIdsToLink.length; // Correct variable name
            let message = "CSV import processed.";
            if (importMode === 'existing_only') message = totalAddedToSegment > 0 ? "CSV import processed. Only existing contacts were added." : "Import processed. No matching existing customers found.";

            // Fix typo here
            return createJsonResponse({ message, newContactsAdded: newContactsAddedCount, existingContactsAddedToSegment: duplicatesAddedCount, totalAddedToSegment: totalAddedToSegment, duplicatesSkipped: duplicatesSkippedCount }, 200);
        }

      } // End /segments/{...} (length 2)

      // Path: /segments/{segmentId}/contacts
      else if (routeSegments.length === 3 && routeSegments[2] === 'contacts') {
        // GET /segments/{segmentId}/contacts -> List Segment Contacts
        if (req.method === 'GET') {
          console.log(`[${requestStartTime}] Routing to: List Segment Contacts`);
        const { segmentId } = parseListSegmentContactsRequest(req, routeSegments);
        const { data: rawData, error } = await listSegmentContactsDb(supabaseClient, segmentId);
        if (error) {
          console.error(`[${requestStartTime}] List Segment Contacts DB Error (ID: ${segmentId}):`, error.message);
          const status = error.code === 'PGRST116' ? 404 : 500;
          const message = status === 404 ? "Segment not found or access denied" : "Failed to list segment contacts";
          return createJsonResponse({ error: message }, status);
        }
        const contacts = formatListSegmentContactsResponse(rawData);
          return createJsonResponse(contacts, 200);
        }
        // POST /segments/{segmentId}/contacts -> Add Contact to Segment
        else if (req.method === 'POST') {
          console.log(`[${requestStartTime}] Routing to: Add Contact to Segment`);
        const { segmentId, contactId } = await parseAddContactRequest(req, routeSegments);
        const { data, error, status } = await addContactToSegmentDb(supabaseClient, segmentId, contactId);
        if (error) {
           console.error(`[${requestStartTime}] Add Contact to Segment DB Error (SegID: ${segmentId}, ContactID: ${contactId}):`, error.message);
           return createJsonResponse({ error: error.message }, status); // Status from DB func
        }
          return createJsonResponse(data, status); // Status from DB func (200 or 201)
        }
      } // End /segments/{segId}/contacts (length 3)

      // Path: /segments/{segmentId}/contacts/{contactId}
      else if (routeSegments.length === 4 && routeSegments[2] === 'contacts') {
          // DELETE /segments/{segmentId}/contacts/{contactId} -> Remove contact from segment
          if (req.method === 'DELETE') {
              console.log(`[${requestStartTime}] Routing to: Remove Contact from Segment`);
            const { segmentId, contactId } = parseRemoveContactRequest(req, routeSegments);
            const { error } = await removeContactFromSegmentDb(supabaseClient, segmentId, contactId);
            if (error) {
                console.error(`[${requestStartTime}] Remove Contact DB Error (SegID: ${segmentId}, ContactID: ${contactId}):`, error.message);
                const status = error.code === 'PGRST116' ? 404 : 500;
                const message = status === 404 ? "Contact not found in segment or access denied" : "Failed to remove contact from segment";
                return createJsonResponse({ error: message }, status);
            }
              return createJsonResponse(null, 204);
          }
      } // End /segments/{segId}/contacts/{contactId} (length 4)

    } // End base path /segments

    // --- Fallback for Unmatched Routes ---
    console.warn(`[${requestStartTime}] Route Not Found: ${req.method} ${url.pathname}`);
    return createJsonResponse({ error: 'Not Found' }, 404);

  } catch (error) {
    // Catch errors from parsing, auth, utils, or unexpected issues
    // Ensure error has a message property before accessing it
    const errorMessage = (error instanceof Error && error.message) ? error.message : 'Internal server error';
    console.error(`[${requestStartTime}] Unhandled Top-Level Error:`, error.message, error.stack);
    let status = 500;
    if (error.message === "Method Not Allowed") status = 405;
    else if (error.message === "Invalid JSON body") status = 400;
    else if (error.message.includes("required")) status = 400; // Generic required field error
    else if (error.message.startsWith("Authentication error") || error.message === "User not authenticated.") status = 401;
    else if (error.message.startsWith("CSV Parsing Error")) status = 400;
    else if (error.message === "No data rows found in CSV.") status = 400;
    else if (error.message === "Failed to check for existing contacts") status = 500;
    else if (error.message === "Failed to insert new contacts") status = 500;
    // Add other specific error message checks if needed

    return createJsonResponse({ error: error.message || 'Internal server error' }, status);
  } finally {
      const requestEndTime = Date.now();
      console.log(`[${requestStartTime}] Request finished in ${requestEndTime - requestStartTime}ms`);
  }
});
