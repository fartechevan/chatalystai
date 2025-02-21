
import { supabase } from "@/integrations/supabase/client";

export async function fetchConversationsWithParticipants() {
  console.log('Fetching conversations with participants...');
  
  // Get conversations with joined profile and customer data
  const { data: conversationsData, error: conversationsError } = await supabase
    .from('conversations')
    .select(`
      conversation_id,
      sender_id,
      receiver_id,
      sender_type,
      receiver_type,
      created_at,
      updated_at,
      sender_profile:profiles!conversations_sender_id_fkey(
        id,
        name,
        email
      ),
      receiver_profile:profiles(
        id,
        name,
        email
      ),
      sender_customer:customers(
        id,
        name,
        email
      ),
      receiver_customer:customers(
        id,
        name,
        email
      )
    `)
    .order('updated_at', { ascending: false });

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError);
    throw conversationsError;
  }

  // Transform the data to match the expected format
  const transformedData = conversationsData.map(conv => {
    const sender = conv.sender_type === 'profile' 
      ? conv.sender_profile
      : conv.sender_customer;
      
    const receiver = conv.receiver_type === 'profile'
      ? conv.receiver_profile
      : conv.receiver_customer;

    return {
      conversation_id: conv.conversation_id,
      sender_id: conv.sender_id,
      receiver_id: conv.receiver_id,
      sender_type: conv.sender_type,
      receiver_type: conv.receiver_type,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      sender: sender?.[0] ? {
        id: sender[0].id,
        name: sender[0].name,
        email: sender[0].email
      } : null,
      receiver: receiver?.[0] ? {
        id: receiver[0].id,
        name: receiver[0].name,
        email: receiver[0].email
      } : null
    };
  });

  return {
    conversations: transformedData,
    profiles: [], // These are no longer needed since we're using joins
    customers: [] // These are no longer needed since we're using joins
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
