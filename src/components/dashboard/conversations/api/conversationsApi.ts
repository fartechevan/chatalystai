
import { supabase } from "@/integrations/supabase/client";

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
  sender_profile: ParticipantData[] | null;
  receiver_profile: ParticipantData[] | null;
  sender_customer: ParticipantData[] | null;
  receiver_customer: ParticipantData[] | null;
}

export async function fetchConversationsWithParticipants() {
  console.log('Fetching conversations with participants...');
  
  // First, get all conversations
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*')
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

  // Fetch profiles and customers data
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', Array.from(profileIds));

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email')
    .in('id', Array.from(customerIds));

  // Create lookup maps
  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const customersMap = new Map(customers?.map(c => [c.id, c]) || []);

  // Transform the data
  const transformedData = conversations.map(conv => {
    const sender = conv.sender_type === 'profile' 
      ? profilesMap.get(conv.sender_id)
      : customersMap.get(conv.sender_id);

    const receiver = conv.receiver_type === 'profile'
      ? profilesMap.get(conv.receiver_id)
      : customersMap.get(conv.receiver_id);

    return {
      conversation_id: conv.conversation_id,
      sender_id: conv.sender_id,
      receiver_id: conv.receiver_id,
      sender_type: conv.sender_type,
      receiver_type: conv.receiver_type,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        email: sender.email
      } : null,
      receiver: receiver ? {
        id: receiver.id,
        name: receiver.name,
        email: receiver.email
      } : null
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
