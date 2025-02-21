
import { supabase } from "@/integrations/supabase/client";

export async function fetchConversationsWithParticipants() {
  console.log('Fetching conversations...');
  
  // First get the conversations
  const { data: conversationsData, error: conversationsError } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError);
    throw conversationsError;
  }

  // Then fetch all profiles and customers that we need
  const uniqueProfileIds = new Set<string>();
  const uniqueCustomerIds = new Set<string>();

  conversationsData.forEach(conv => {
    if (conv.sender_type === 'profile') uniqueProfileIds.add(conv.sender_id);
    if (conv.receiver_type === 'profile') uniqueProfileIds.add(conv.receiver_id);
    if (conv.sender_type === 'customer') uniqueCustomerIds.add(conv.sender_id);
    if (conv.receiver_type === 'customer') uniqueCustomerIds.add(conv.receiver_id);
  });

  // Fetch profiles
  const { data: profiles = [] } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', Array.from(uniqueProfileIds));

  // Fetch customers
  const { data: customers = [] } = await supabase
    .from('customers')
    .select('id, name, email')
    .in('id', Array.from(uniqueCustomerIds));

  return {
    conversations: conversationsData,
    profiles,
    customers
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
