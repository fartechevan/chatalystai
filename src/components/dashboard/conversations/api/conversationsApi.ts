
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "../types";

export async function fetchConversationsWithParticipants() {
  console.log('Fetching conversations with participants...');

  // First, get all conversations with their associated leads
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*, lead:lead_id(*)')
    .order('updated_at', { ascending: false });

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError);
    throw conversationsError;
  }

  console.log('Fetched conversations:', conversations);

  // Transform the data
  const transformedData = conversations.map(conv => {
    return {
      conversation_id: conv.conversation_id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      lead_id: conv.lead_id,
      lead: conv.lead
    };
  });

  return {
    conversations: transformedData,
    profiles: [],
    customers: []
  };
}

export async function fetchMessages(conversationId: string) {
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }

  return messagesData;
}

export async function fetchConversationSummary(conversationId: string) {
  const { data: summaryData } = await supabase
    .from('conversation_summaries')
    .select('summary, created_at')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  return summaryData;
}

export async function sendMessage(conversationId: string, participantId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_participant_id: participantId,
      content
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchLeadByConversation(conversationId: string): Promise<Lead | null> {
  // First get the conversation to find its lead_id
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('lead_id')
    .eq('conversation_id', conversationId)
    .maybeSingle();
  
  if (error || !conversation?.lead_id) {
    console.log('No lead associated with this conversation:', conversationId);
    return null;
  }
  
  return fetchLeadById(conversation.lead_id);
}

export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  if (!leadId) return null;
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching lead:', error);
    return null;
  }
  
  if (!data) return null;
  
  // Create a properly typed Lead object with all properties explicitly cast
  const lead: Lead = {
    id: data.id,
    name: data.name,
    created_at: data.created_at,
    updated_at: data.updated_at || undefined,
    user_id: data.user_id,
    pipeline_stage_id: data.pipeline_stage_id || null,
    customer_id: data.customer_id || null,
    value: data.value || null,
    company_name: data.company_name || null,
    company_address: data.company_address || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    contact_first_name: data.contact_first_name || null
  };
  
  return lead;
}
