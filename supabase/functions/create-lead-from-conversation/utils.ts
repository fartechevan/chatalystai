/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../_shared/database.types.ts";

type LeadsResponse = Database["public"]["Tables"]["leads"]["Row"];
type LeadsInsert = Database["public"]["Tables"]["leads"]["Insert"];
type ConversationsUpdate = Database["public"]["Tables"]["conversations"]["Update"];

interface CreateLeadRequest {
  conversationId: string;
  customerId: string;
}

/**
 * Parses and validates the incoming request for creating a lead from a conversation.
 * Checks for POST method and required conversationId/customerId in the body.
 *
 * @param req The incoming request object.
 * @returns The validated conversationId and customerId.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<CreateLeadRequest> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<CreateLeadRequest>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { conversationId, customerId } = body;

  if (!conversationId || !customerId) {
    throw new Error("Missing required parameters: conversationId and customerId"); // Caught for 400
  }

  return { conversationId, customerId };
}

/**
 * Checks if a conversation already has an associated lead.
 *
 * @param supabase The Supabase client instance (Service Role recommended).
 * @param conversationId The ID of the conversation.
 * @returns The existing lead_id if found, otherwise null.
 * @throws Error on database query failure.
 */
export async function getConversationLeadIdDb(
  supabase: SupabaseClient<Database>,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('lead_id')
    .eq('conversation_id', conversationId) // Ensure this column name is correct
    .maybeSingle();

  if (error) {
    console.error(`Error checking lead for conversation ${conversationId}:`, error);
    throw new Error(`Database error checking conversation: ${error.message}`);
  }
  return data?.lead_id ?? null;
}

/**
 * Fetches prerequisites for lead creation: customer name and default pipeline stage ID.
 *
 * @param supabase The Supabase client instance (Service Role recommended).
 * @param customerId The ID of the customer.
 * @returns An object containing customerName and defaultStageId.
 * @throws Error if customer or default stage is not found, or on DB error.
 */
export async function fetchLeadCreationPrerequisitesDb(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<{ customerName: string | null; defaultStageId: string }> {
  // Fetch customer name
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('name')
    .eq('id', customerId)
    .single(); // Use single as customer should exist

  if (customerError) {
    console.error(`Error fetching customer ${customerId}:`, customerError);
    throw new Error(`Customer with ID ${customerId} not found or DB error: ${customerError.message}`);
  }
  const customerName = customerData?.name ?? null;

  // Fetch default pipeline stage ID
  const { data: defaultStageData, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('is_default', true)
    .limit(1)
    .single();

  if (stageError || !defaultStageData) {
    console.error('Error fetching default pipeline stage:', stageError);
    throw new Error('Could not find a default pipeline stage or DB error.');
  }
  const defaultStageId = defaultStageData.id;

  return { customerName, defaultStageId };
}

/**
 * Creates a new lead record in the database.
 *
 * @param supabase The Supabase client instance (Service Role recommended).
 * @param customerId The ID of the customer.
 * @param stageId The ID of the pipeline stage.
 * @param userId The ID of the user creating the lead.
 * @returns The newly created lead record.
 * @throws Error if lead creation fails or returns no data.
 */
export async function createLeadRecordDb(
  supabase: SupabaseClient<Database>,
  customerId: string,
  stageId: string,
  userId: string // Added userId parameter
): Promise<LeadsResponse> {
  const leadInsertData: LeadsInsert = {
    customer_id: customerId,
    pipeline_stage_id: stageId,
    user_id: userId, // Added required user_id
    // 'name' column does not exist in the leads table based on database.types.ts
    // value: null // Set default value if needed
  };

  const { data: newLeadData, error: leadInsertError } = await supabase
    .from('leads')
    .insert(leadInsertData)
    .select()
    .single();

  if (leadInsertError) {
    console.error("Error inserting lead:", leadInsertError);
    throw new Error(`Failed to create lead: ${leadInsertError.message}`);
  }
  if (!newLeadData) {
    // This case should ideally not happen if insert succeeds without error, but check anyway
    throw new Error("Lead created but no data returned.");
  }

  return newLeadData;
}

/**
 * Updates a conversation record to link it to a newly created lead.
 *
 * @param supabase The Supabase client instance (Service Role recommended).
 * @param conversationId The ID of the conversation to update.
 * @param leadId The ID of the lead to link.
 * @returns PostgrestError if the update fails, otherwise null.
 */
export async function linkLeadToConversationDb(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  leadId: string
): Promise<PostgrestError | null> {
  const conversationUpdateData: ConversationsUpdate = { lead_id: leadId };

  const { error } = await supabase
    .from('conversations')
    .update(conversationUpdateData)
    .eq('conversation_id', conversationId); // Ensure this column name is correct

  if (error) {
    console.error(`Failed to link lead ${leadId} to conversation ${conversationId}:`, error);
    // Return the error to be handled by the caller
  }

  return error;
}
