
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "../types";

interface ParticipantData {
  id: string;
  name: string | null;
  email: string;
}

interface ConversationWithParticipants {
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  sender_type: string;
  receiver_type: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  sender: ParticipantData | null;
  receiver: ParticipantData | null;
}

export async function fetchConversationsWithParticipants() {
  console.log('Fetching conversations with participants...');

  // First, get all conversations
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*, lead:lead_id(*)')
    .order('updated_at', { ascending: false });

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError);
    throw conversationsError;
  }

  // Fetch all unique profile IDs and customer IDs
  const profileIds = new Set<string>();
  const customerIds = new Set<string>();

  conversations.forEach(conv => {
    if (conv.sender_type === 'profile') profileIds.add(conv.sender_id);
    if (conv.receiver_type === 'profile') profileIds.add(conv.receiver_id);
    if (conv.sender_type === 'customer') customerIds.add(conv.sender_id);
    if (conv.receiver_type === 'customer') customerIds.add(conv.receiver_id);
  });

  console.log('Fetched conversations:', conversations);
  console.log('Fetched customerIds:', customerIds);
  console.log('Fetched profileIds:', profileIds);

  // Fetch profiles and customers data
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', Array.from(profileIds));

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email')
    .in('id', Array.from(customerIds));

  console.log('Fetched profiles:', profiles);
  console.log('Fetched customers:', customers);

  // Create lookup maps for profiles and customers
  const profilesMap = new Map<string, ParticipantData>();
  const customersMap = new Map<string, ParticipantData>();

  // Populate profiles map
  profiles?.forEach(profile => {
    profilesMap.set(profile.id, {
      id: profile.id,
      name: profile.name || `Unknown Profile`,
      email: profile.email
    });
  });

  // Populate customers map
  customers?.forEach(customer => {
    customersMap.set(customer.id, {
      id: customer.id,
      name: customer.name || `Unknown Customer`,
      email: customer.email || ''
    });
  });

  // Transform the data
  const transformedData = conversations.map(conv => {
    const getParticipant = (id: string, type: string): ParticipantData => {
      if (type === 'profile') {
        return profilesMap.get(id) || {
          id,
          name: `Unknown Profile`,
          email: ''
        };
      } else if (type === 'customer') {
        return customersMap.get(id) || {
          id,
          name: `Unknown Customer`,
          email: ''
        };
      }
      return {
        id,
        name: `Unknown ${type}`,
        email: ''
      };
    };

    const sender = getParticipant(conv.sender_id, conv.sender_type);
    const receiver = getParticipant(conv.receiver_id, conv.receiver_type);

    return {
      conversation_id: conv.conversation_id,
      sender_id: conv.sender_id,
      receiver_id: conv.receiver_id,
      sender_type: conv.sender_type,
      receiver_type: conv.receiver_type,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      lead_id: conv.lead_id,
      sender,
      receiver,
      lead: conv.lead
    };
  });

  return {
    conversations: transformedData,
    profiles: profiles || [],
    customers: customers || []
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

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_id: senderId,
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
  
  // Fetch the lead directly using the lead_id
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', conversation.lead_id)
    .maybeSingle();
    
  if (leadError) {
    console.error('Error fetching lead:', leadError);
    return null;
  }
  
  return lead;
}
