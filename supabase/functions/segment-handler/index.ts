import { serve } from "std/http/server.ts"; // Revert to alias
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/supabaseClient.ts";
// --- Helper Functions ---
function createJsonResponse(body, status = 200) {
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = {
    ...corsHeaders
  };
  if (status !== 204) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(responseBody, {
    status,
    headers
  });
}
// --- Utility Functions (Adapted from individual utils.ts) ---
// --- List Segments Utils ---
function validateListSegmentsRequest(req) {
  if (req.method !== "GET") throw new Error("Method Not Allowed");
}
async function listSegmentsDb(supabase, userId) {
  console.log(`[listSegmentsDb] Fetching segments for user: ${userId}`); // Add entry log
  const { data, error } = await supabase.from("segments").select("id, name, created_at").order("created_at", {
    ascending: false
  });
  if (error) {
    console.error(`[listSegmentsDb] DB Error for user ${userId}:`, JSON.stringify(error)); // Log the specific DB error
  } else {
    console.log(`[listSegmentsDb] Successfully fetched ${data?.length ?? 0} segments for user ${userId}.`); // Log success
  }
  return {
    data,
    error
  };
}
// --- Create Segment Utils ---
async function parseCreateSegmentRequest(req) {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  let body;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
  const { name } = body;
  if (!name || typeof name !== "string" || name.trim() === "") throw new Error("Segment name is required");
  return {
    name: name.trim()
  };
}
async function createSegmentDb(supabase, name, userId) {
  console.log(`[createSegmentDb] Attempting to insert segment with name: "${name}" for user: ${userId}`); // Log input
  const { data, error } = await supabase.from("segments").insert({
    name: name,
    user_id: userId
  }).select().single();
  if (error) {
    console.error(`[createSegmentDb] DB Insert Error:`, JSON.stringify(error)); // Log specific error
  } else {
    console.log(`[createSegmentDb] Successfully inserted segment. Result ID: ${data?.id}`); // Log success
  }
  return {
    data,
    error
  };
}
// --- Delete Segment Utils ---
function parseDeleteSegmentRequest(req, pathSegments) {
  if (req.method !== "DELETE") throw new Error("Method Not Allowed");
  // Assumes path like /segments/{segmentId} -> segmentId is the last segment
  const segmentId = pathSegments[pathSegments.length - 1];
  if (!segmentId) throw new Error("Segment ID is required in the URL path");
  return {
    segmentId
  };
}
async function deleteSegmentDb(supabase, segmentId) {
  const { error } = await supabase.from("segments").delete().eq("id", segmentId);
  return {
    error
  };
}
// --- List Segment Contacts Utils ---
function parseListSegmentContactsRequest(req, pathSegments) {
  if (req.method !== "GET") throw new Error("Method Not Allowed");
  // Assumes path like /segments/{segmentId}/contacts -> segmentId is second to last
  const segmentId = pathSegments[pathSegments.length - 2];
  if (!segmentId) throw new Error("Segment ID is required in the URL path");
  return {
    segmentId
  };
}
async function listSegmentContactsDb(supabase, segmentId) {
  const { data, error } = await supabase.from("segment_contacts").select(`segment_id, added_at, customers ( id, name, phone_number, email )`).eq("segment_id", segmentId);
  return {
    data,
    error
  };
}
function formatListSegmentContactsResponse(rawData) {
  if (!rawData) return [];
  return rawData.map((item)=>item.customers).filter((customer)=>customer !== null);
}
// --- Add Contact to Segment Utils ---
async function parseAddContactRequest(req, pathSegments) {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  // Assumes path like /segments/{segmentId}/contacts
  const segmentId = pathSegments[pathSegments.length - 2];
  if (!segmentId) throw new Error("Segment ID is required in the URL path");
  let body;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
  const { contact_id } = body;
  if (!contact_id) throw new Error("Contact ID (contact_id) is required in the request body");
  return {
    segmentId,
    contactId: contact_id
  };
}
async function addContactToSegmentDb(supabase, segmentId, contactId) {
  const { data, error, status } = await supabase.from("segment_contacts").upsert({
    segment_id: segmentId,
    contact_id: contactId
  }, {
    onConflict: 'segment_id, contact_id',
    ignoreDuplicates: true
  }).select().maybeSingle();
  if (error) {
    if (error.code === '23503') return {
      data: null,
      error: {
        message: "Segment or Contact not found"
      },
      status: 404
    };
    return {
      data: null,
      error: {
        message: error.message || "Database error"
      },
      status: 500
    };
  }
  return {
    data,
    error: null,
    status: data ? 201 : 200
  }; // 201 if created/ensured
}
// --- Remove Contact from Segment Utils ---
function parseRemoveContactRequest(req, pathSegments) {
  if (req.method !== "DELETE") throw new Error("Method Not Allowed");
  // Assumes path like /segments/{segmentId}/contacts/{contactId}
  const contactId = pathSegments[pathSegments.length - 1];
  const segmentId = pathSegments[pathSegments.length - 3]; // Check index carefully
  if (!segmentId || !contactId) {
    throw new Error("Segment ID and Contact ID are required in the URL path (e.g., /segments/{segId}/contacts/{contactId})");
  }
  return {
    segmentId,
    contactId
  };
}
async function removeContactFromSegmentDb(supabase, segmentId, contactId) {
  const { error } = await supabase.from("segment_contacts").delete().match({
    segment_id: segmentId,
    contact_id: contactId
  });
  return {
    error
  };
}
// --- Bulk Add Contacts to Segment Utils ---
async function parseBulkAddContactsRequest(req, pathSegments) {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  // Assumes path like /segments/{segmentId}/contacts/bulk
  const segmentId = pathSegments[pathSegments.length - 3]; // segmentId is third from last
  if (!segmentId) throw new Error("Segment ID is required in the URL path (e.g., /segments/{segId}/contacts/bulk)");
  let body;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
  const { contactIds } = body;
  if (!Array.isArray(contactIds)) throw new Error("contactIds must be provided as an array in the request body.");
  // Optional: Add validation that IDs are strings, non-empty array etc.
  if (contactIds.length === 0) throw new Error("contactIds array cannot be empty.");
  return {
    segmentId,
    contactIds
  };
}
// Uses addContactsToSegmentDb (defined above)
// --- Create Segment From Contacts Utils ---
async function parseCreateSegmentFromContactsRequest(req) {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  let body;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
  const { segmentName, customerIds, userId } = body;
  if (!segmentName || typeof segmentName !== 'string' || segmentName.trim() === '') throw new Error('Segment name is required and must be a non-empty string.');
  if (!Array.isArray(customerIds) || customerIds.length === 0) throw new Error('Customer IDs must be provided as a non-empty array.');
  if (!userId || typeof userId !== 'string') throw new Error('User ID is required.'); // Needed for createSegmentDb call
  return {
    segmentName: segmentName.trim(),
    customerIds,
    userId
  };
}
// Uses createSegmentDb (defined above)
async function addContactsToSegmentDb(supabase, segmentId, contactIds) {
  if (contactIds.length === 0) return {
    error: null
  };
  const segmentContactsData = contactIds.map((contactId)=>({
      segment_id: segmentId,
      contact_id: contactId
    }));
  console.log(`[addContactsToSegmentDb] Attempting to insert ${segmentContactsData.length} contacts for segment: ${segmentId}`); // Log input
  // const { error } = await supabase.from('segment_contacts').insert(segmentContactsData); // Consider upsert
  const { error } = await supabase.from('segment_contacts').upsert(segmentContactsData, {
    onConflict: 'segment_id, contact_id'
  });
  if (error) {
    console.error(`[addContactsToSegmentDb] DB Insert Error (Segment ${segmentId}):`, JSON.stringify(error)); // Log specific error
  } else {
    console.log(`[addContactsToSegmentDb] Successfully inserted ${segmentContactsData.length} contacts for segment: ${segmentId}`); // Log success
  }
  return {
    error
  };
}
// --- Import CSV Utils ---
async function parseImportCsvRequest(req) {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  let body;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }
  const { csvData, segmentId, importMode, columnMapping, duplicateAction } = body;
  if (!csvData || !segmentId) throw new Error("CSV data (csvData) and Segment ID (segmentId) are required");
  if (importMode && ![
    'save_new',
    'existing_only'
  ].includes(importMode)) throw new Error("Invalid importMode. Must be 'save_new' or 'existing_only'.");
  if (duplicateAction && ![
    'skip',
    'add'
  ].includes(duplicateAction)) throw new Error("Invalid duplicateAction. Must be 'skip' or 'add'.");
  return {
    csvData,
    segmentId,
    importMode: importMode || 'save_new',
    columnMapping,
    duplicateAction: duplicateAction || 'skip'
  };
}
async function parseCsvUtil(csvString, columnMapping) {
  const EXPECTED_PHONE_HEADER = "phone_number";
  const OPTIONAL_NAME_HEADER = "name";
  let parsedData;
  let headers;
  try {
    // Step 1: Normalize line endings and split into lines
    const lines = csvString.trim().split(/\r?\n/);
    // Step 2: Parse headers (first line)
    const rawHeaders = lines[0].split(",").map((h)=>h.trim());
    // Step 3: Parse data rows (remaining lines)
    const result = lines.slice(1).map((line)=>line.split(",").map((cell)=>cell.trim()));
    console.log("Results: ", result);
    console.log("Raw Headers: ", rawHeaders);
    if (!rawHeaders || rawHeaders.length === 0) throw new Error("CSV is empty or header row is missing.");
    headers = rawHeaders.map((h)=>h.trim().toLowerCase());
    const phoneHeader = headers.find((h)=>h === EXPECTED_PHONE_HEADER || columnMapping && columnMapping[h] === EXPECTED_PHONE_HEADER);
    if (!phoneHeader) throw new Error(`Required header '${EXPECTED_PHONE_HEADER}' not found or mapped.`);
    parsedData = result.map((row, index)=>{
      const rowData = {
        phone_number: ''
      };
      headers.forEach((header, i)=>{
        const csvValue = row[i]?.trim() || '';
        const targetKey = columnMapping?.[header] || header;
        if (targetKey === EXPECTED_PHONE_HEADER) rowData.phone_number = csvValue;
        else if (targetKey === OPTIONAL_NAME_HEADER) rowData.name = csvValue || undefined;
        else rowData[header] = csvValue || undefined;
      });
      if (!rowData.phone_number) throw new Error(`Missing phone number in CSV row ${index + 2}`);
      return rowData;
    });
  } catch (parseError) {
    throw new Error(`CSV Parsing Error: ${parseError.message}`);
  }
  if (parsedData.length === 0) throw new Error("No data rows found in CSV.");
  return parsedData;
}
async function findExistingContactsDb(supabase, phoneNumbers) {
  if (phoneNumbers.length === 0) return new Map();
  const { data: existingContacts, error: fetchError } = await supabase.from("customers").select("id, phone_number").in("phone_number", phoneNumbers);
  if (fetchError) throw new Error("Failed to check for existing contacts");
  return new Map(existingContacts?.map((c)=>[
      c.phone_number,
      c.id
    ]) || []);
}
function categorizeCsvRows(parsedData, existingPhoneMap) {
  const duplicates = [];
  const newContactsData = [];
  parsedData.forEach((row, index)=>{
    const existingId = existingPhoneMap.get(row.phone_number);
    if (existingId) duplicates.push({
      csvRowIndex: index + 2,
      csvData: row,
      existingContactId: existingId
    });
    else newContactsData.push({
      phone_number: row.phone_number,
      name: row.name || `Imported ${row.phone_number}`
    });
  });
  return {
    newContactsData,
    duplicates
  };
}
async function insertNewContactsDb(supabase, contactsToInsert) {
  if (contactsToInsert.length === 0) return [];
  const { data: insertedData, error: insertError } = await supabase.from("customers").insert(contactsToInsert).select("id");
  if (insertError) throw new Error("Failed to insert new contacts");
  return (insertedData || []).map((c)=>c.id);
}
// Uses addContactsToSegmentDb (defined above)
// --- Main Handler ---
serve(async (req)=>{
  // Immediately handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', {
      headers: corsHeaders
    });
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
    // Log routeSegments immediately after calculation
    console.log(`[${requestStartTime}] Calculated routeSegments: [${routeSegments.join(', ')}], Length: ${routeSegments.length}`);
    console.log(`[${requestStartTime}] Handling ${req.method} for route segments: ${routeSegments.join('/')}`);
    // --- Main Routing based on path segments ---
    // Base path: /segments
    if (routeSegments[0] === 'segments') {
      // Path: /segments
      if (routeSegments.length === 1) {
        // GET /segments -> List Segments
        if (req.method === 'GET') {
          console.log(`[${requestStartTime}] Routing to: List Segments for user ${user.id}`); // Log user ID
          validateListSegmentsRequest(req); // Basic method check
          console.log(`[${requestStartTime}] Calling listSegmentsDb...`); // Log before call
          const { data, error } = await listSegmentsDb(supabaseClient, user.id);
          console.log(`[${requestStartTime}] listSegmentsDb returned. Error: ${!!error}`); // Log after call
          if (error) {
            console.error(`[${requestStartTime}] List Segments DB Error caught in handler:`, error.message); // Log error in handler
            return createJsonResponse({
              error: error.message || "Failed to list segments"
            }, 500);
          }
          return createJsonResponse(data ?? [], 200);
        } else if (req.method === 'POST') {
          console.log(`[${requestStartTime}] Routing to: Create Segment`);
          const { name } = await parseCreateSegmentRequest(req);
          const { data, error } = await createSegmentDb(supabaseClient, name, user.id);
          if (error) {
            console.error(`[${requestStartTime}] Create Segment DB Error:`, error.message);
            return createJsonResponse({
              error: error.message || "Failed to create segment"
            }, 500); // Add 409 check?
          }
          return createJsonResponse(data, 201);
        }
      } else if (routeSegments.length === 2) {
        // DELETE /segments/{segmentId} -> Delete Segment
        if (req.method === 'DELETE' && routeSegments[1] !== 'from-contacts' && routeSegments[1] !== 'import-csv') {
          console.log(`[${requestStartTime}] Routing to: Delete Segment`);
          const { segmentId } = parseDeleteSegmentRequest(req, routeSegments);
          const { error } = await deleteSegmentDb(supabaseClient, segmentId);
          if (error) {
            console.error(`[${requestStartTime}] Delete Segment DB Error (ID: ${segmentId}):`, error.message);
            const status = error.code === 'PGRST116' ? 404 : 500;
            const message = status === 404 ? "Segment not found or access denied" : "Failed to delete segment";
            return createJsonResponse({
              error: message
            }, status);
          }
          return createJsonResponse(null, 204);
        } else if (req.method === 'POST' && routeSegments[1] === 'from-contacts') {
          console.log(`[${requestStartTime}] Routing to: Create Segment From Contacts`);
          const { segmentName, customerIds, userId: requestUserId } = await parseCreateSegmentFromContactsRequest(req);
          // Security check: Ensure the userId in the payload matches the authenticated user
          if (requestUserId !== user.id) {
            console.warn(`[${requestStartTime}] Create Segment From Contacts Auth Mismatch: Payload user ${requestUserId} != Auth user ${user.id}`);
            return createJsonResponse({
              error: "User ID mismatch"
            }, 403); // Forbidden
          }
          // Create segment
          const { data: segmentData, error: segmentError } = await createSegmentDb(supabaseClient, segmentName, user.id);
          if (segmentError || !segmentData) {
            console.error(`[${requestStartTime}] Create Segment From Contacts - Segment Creation Error:`, segmentError?.message);
            return createJsonResponse({
              error: segmentError?.message || "Failed to create segment"
            }, 500);
          }
          // Add contacts
          const { error: addError } = await addContactsToSegmentDb(supabaseClient, segmentData.id, customerIds);
          if (addError) {
            // Check if addError has a message property before accessing it
            const errorMessage = addError && typeof addError === 'object' && 'message' in addError ? addError.message : 'Unknown error';
            console.error(`[${requestStartTime}] Create Segment From Contacts - Add Contacts Error (SegID: ${segmentData.id}):`, errorMessage);
            return createJsonResponse({
              error: "Segment created but failed to add some contacts: " + errorMessage,
              segmentId: segmentData.id
            }, 500);
          }
          return createJsonResponse(segmentData, 201);
        } else if (req.method === 'POST' && routeSegments[1] === 'import-csv') {
          console.log(`[${requestStartTime}] Routing to: Import CSV to Segment`);
          const { csvData, segmentId, importMode, columnMapping, duplicateAction } = await parseImportCsvRequest(req);
          const parsedCsvData = await parseCsvUtil(csvData, columnMapping);
          const phoneNumbers = parsedCsvData.map((row)=>row.phone_number).filter(Boolean);
          const existingPhoneMap = await findExistingContactsDb(supabaseClient, phoneNumbers);
          const { newContactsData, duplicates } = categorizeCsvRows(parsedCsvData, existingPhoneMap);
          let contactsToInsert = [];
          const existingContactIdsToAdd = [];
          let duplicatesSkippedCount = 0;
          duplicates.forEach((dup)=>{
            if (importMode === 'save_new' && duplicateAction === 'add' || importMode === 'existing_only') {
              existingContactIdsToAdd.push(dup.existingContactId);
            } else {
              duplicatesSkippedCount++;
            }
          });
          if (importMode === 'save_new') contactsToInsert = newContactsData;
          let newlyInsertedIds = [];
          if (contactsToInsert.length > 0) {
            newlyInsertedIds = await insertNewContactsDb(supabaseClient, contactsToInsert);
          }
          const finalContactIdsToLink = [
            ...existingContactIdsToAdd,
            ...newlyInsertedIds
          ];
          // const linkError = await addContactsToSegmentDb(supabaseClient, segmentId, finalContactIdsToLink); // Reusing addContactsToSegmentDb
          const linkResult = await addContactsToSegmentDb(supabaseClient, segmentId, finalContactIdsToLink);
          if (linkResult?.error) {
            const errorMessage = linkResult.error.message || 'Unknown link error';
            console.error(`[${requestStartTime}] Import CSV - Link Contacts Error (SegID: ${segmentId}):`, errorMessage);
            return createJsonResponse({
              error: errorMessage
            }, 500);
          // Check if linkError has message and code properties before accessing
          // const errorMessage = (linkError && typeof linkError === 'object' && 'message' in linkError) ? linkError.message : 'Unknown link error';
          // const errorCode = (linkError && typeof linkError === 'object' && 'code' in linkError) ? linkError.code : null;
          // console.error(`[${requestStartTime}] Import CSV - Link Contacts Error (SegID: ${segmentId}):`, errorMessage);
          // let status = 500; let message = "Failed to add contacts to segment";
          // if (errorCode && errorCode === '23503') { status = 404; message = "Target segment not found."; }
          // return createJsonResponse({ error: message }, status);
          }
          const newContactsAddedCount = newlyInsertedIds.length;
          const duplicatesAddedCount = existingContactIdsToAdd.length;
          const totalAddedToSegment = finalContactIdsToLink.length; // Correct variable name
          let message = "CSV import processed.";
          if (importMode === 'existing_only') message = totalAddedToSegment > 0 ? "CSV import processed. Only existing contacts were added." : "Import processed. No matching existing customers found.";
          // Fix typo here
          return createJsonResponse({
            message,
            newContactsAdded: newContactsAddedCount,
            existingContactsAddedToSegment: duplicatesAddedCount,
            totalAddedToSegment: totalAddedToSegment,
            duplicatesSkipped: duplicatesSkippedCount
          }, 200);
        }
      } else if (routeSegments.length === 3 && routeSegments[2] === 'contacts') {
        // GET /segments/{segmentId}/contacts -> List Segment Contacts
        if (req.method === 'GET') {
          console.log(`[${requestStartTime}] Routing to: List Segment Contacts`);
          const { segmentId } = parseListSegmentContactsRequest(req, routeSegments);
          console.log(`[${requestStartTime}] Fetching contacts for segment ID: ${segmentId}`); // Added log
          const { data: rawData, error } = await listSegmentContactsDb(supabaseClient, segmentId);
          // --- BEGIN ADDED LOGGING ---
          console.log(`[${requestStartTime}] Raw data from listSegmentContactsDb for segment ${segmentId}:`, JSON.stringify(rawData, null, 2));
          if (rawData && rawData.length > 0) {
            console.log(`[${requestStartTime}] First raw item's customers object:`, JSON.stringify(rawData[0].customers, null, 2));
          }
          // --- END ADDED LOGGING ---
          if (error) {
            console.error(`[${requestStartTime}] List Segment Contacts DB Error (ID: ${segmentId}):`, error.message);
            const status = error.code === 'PGRST116' ? 404 : 500;
            const message = status === 404 ? "Segment not found or access denied" : "Failed to list segment contacts";
            return createJsonResponse({
              error: message
            }, status);
          }
          const contacts = formatListSegmentContactsResponse(rawData);
          console.log(`[${requestStartTime}] Formatted contacts for segment ${segmentId}:`, JSON.stringify(contacts, null, 2)); // Added log for formatted output
          return createJsonResponse(contacts, 200);
        } else if (req.method === 'POST') {
          console.log(`[${requestStartTime}] Routing to: Add Contact to Segment`);
          const { segmentId, contactId } = await parseAddContactRequest(req, routeSegments);
          const { data, error, status } = await addContactToSegmentDb(supabaseClient, segmentId, contactId);
          if (error) {
            console.error(`[${requestStartTime}] Add Contact to Segment DB Error (SegID: ${segmentId}, ContactID: ${contactId}):`, error.message);
            return createJsonResponse({
              error: error.message
            }, status); // Status from DB func
          }
          return createJsonResponse(data, status); // Status from DB func (200 or 201)
        }
      } else if (routeSegments.length === 4 && routeSegments[2] === 'contacts' && routeSegments[3] === 'bulk') {
        // POST /segments/{segmentId}/contacts/bulk -> Bulk add contacts to segment
        if (req.method === 'POST') {
          console.log(`[${requestStartTime}] Routing to: Bulk Add Contacts to Segment`);
          const { segmentId, contactIds } = await parseBulkAddContactsRequest(req, routeSegments);
          const { error } = await addContactsToSegmentDb(supabaseClient, segmentId, contactIds); // Reuse existing DB function
          if (error) {
            console.error(`[${requestStartTime}] Bulk Add Contacts DB Error (SegID: ${segmentId}):`, error.message);
            // Determine status based on error code (e.g., 404 if segment not found)
            const status = error.code === '23503' ? 404 : 500;
            const message = status === 404 ? "Segment not found or some contacts invalid" : "Failed to bulk add contacts to segment";
            return createJsonResponse({
              error: message
            }, status);
          }
          return createJsonResponse({
            message: `Successfully added ${contactIds.length} contacts to segment ${segmentId}`
          }, 200); // 200 OK for bulk operation
        }
      } else if (routeSegments.length === 4 && routeSegments[2] === 'contacts') {
        // DELETE /segments/{segmentId}/contacts/{contactId} -> Remove contact from segment
        // Note: This check now correctly comes *after* the more specific '/bulk' check.
        if (req.method === 'DELETE') {
          console.log(`[${requestStartTime}] Routing to: Remove Contact from Segment`);
          const { segmentId, contactId } = parseRemoveContactRequest(req, routeSegments);
          const { error } = await removeContactFromSegmentDb(supabaseClient, segmentId, contactId);
          if (error) {
            console.error(`[${requestStartTime}] Remove Contact DB Error (SegID: ${segmentId}, ContactID: ${contactId}):`, error.message);
            const status = error.code === 'PGRST116' ? 404 : 500;
            const message = status === 404 ? "Contact not found in segment or access denied" : "Failed to remove contact from segment";
            return createJsonResponse({
              error: message
            }, status);
          }
          return createJsonResponse(null, 204);
        }
      } // End /segments/{segId}/contacts/{contactId} (length 4)
    } // End base path /segments
    // --- Direct POST to base path handler (for specific actions like create from contacts) ---
    console.log(`[${requestStartTime}] Checking for direct POST: Method=${req.method}, RouteSegmentsLength=${routeSegments.length}`); // Added log
    if (req.method === 'POST' && routeSegments.length === 0) {
      console.log(`[${requestStartTime}] Condition met. Handling direct POST to base path.`); // Added log
      // Try parsing as Create Segment From Contacts request
      try {
        const body = await req.clone().json(); // Clone request to read body safely
        if (body.segmentName && Array.isArray(body.customerIds) && body.userId) {
          console.log(`[${requestStartTime}] Routing direct POST to: Create Segment From Contacts`);
          const { segmentName, customerIds, userId: requestUserId } = body;
          // Security check: Ensure the userId in the payload matches the authenticated user
          if (requestUserId !== user.id) {
            console.warn(`[${requestStartTime}] Create Segment From Contacts Auth Mismatch: Payload user ${requestUserId} != Auth user ${user.id}`);
            return createJsonResponse({
              error: "User ID mismatch"
            }, 403); // Forbidden
          }
          // Create segment
          const { data: segmentData, error: segmentError } = await createSegmentDb(supabaseClient, segmentName, user.id);
          if (segmentError || !segmentData) {
            console.error(`[${requestStartTime}] Create Segment From Contacts - Segment Creation Error:`, segmentError?.message);
            return createJsonResponse({
              error: segmentError?.message || "Failed to create segment"
            }, 500);
          }
          // Add contacts
          const { error: addError } = await addContactsToSegmentDb(supabaseClient, segmentData.id, customerIds);
          if (addError) {
            const errorMessage = addError && typeof addError === 'object' && 'message' in addError ? addError.message : 'Unknown error';
            console.error(`[${requestStartTime}] Create Segment From Contacts - Add Contacts Error (SegID: ${segmentData.id}):`, errorMessage);
            return createJsonResponse({
              error: "Segment created but failed to add some contacts: " + errorMessage,
              segmentId: segmentData.id
            }, 500);
          }
          return createJsonResponse(segmentData, 201);
        }
      } catch (parseError) {
        console.log(`[${requestStartTime}] Direct POST body parsing failed or didn't match CreateSegmentFromContacts: ${parseError.message}`);
      // Fall through to Not Found if parsing fails or doesn't match expected structure
      }
    }
    // --- Fallback for Unmatched Routes ---
    console.warn(`[${requestStartTime}] Route Not Found: ${req.method} ${url.pathname}`);
    return createJsonResponse({
      error: 'Not Found'
    }, 404);
  } catch (error) {
    // Catch errors from parsing, auth, utils, or unexpected issues
    // Ensure error has a message property before accessing it
    const errorMessage = error instanceof Error && error.message ? error.message : 'Internal server error';
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
    return createJsonResponse({
      error: error.message || 'Internal server error'
    }, status);
  } finally{
    const requestEndTime = Date.now();
    console.log(`[${requestStartTime}] Request finished in ${requestEndTime - requestStartTime}ms`);
  }
});
