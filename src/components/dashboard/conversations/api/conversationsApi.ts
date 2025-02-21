
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
      sender_profile:profiles(
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
  const transformedData = (conversationsData as unknown as ConversationWithParticipants[]).map(conv => {
    // Get the correct participant data based on type
    const senderData = conv.sender_type === 'profile' 
      ? conv.sender_profile
      : conv.sender_customer;
      
    const receiverData = conv.receiver_type === 'profile'
      ? conv.receiver_profile
      : conv.receiver_customer;

    // Extract the first participant from the array (if it exists)
    const sender = senderData && senderData[0];
    const receiver = receiverData && receiverData[0];

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
