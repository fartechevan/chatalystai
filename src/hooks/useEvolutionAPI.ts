
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InstanceInfo {
  instance: {
    instanceId: string;
    owner: string;
    profileName: string;
    profilePictureUrl: string;
    phoneNumber: string;
    state: string;
  };
}

interface Chat {
  id: string;
  name: string;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface Message {
  key: string;
  id: string;
  content: string;
  fromMe: boolean;
  timestamp: number;
  sender: string;
}

export function useEvolutionAPI(instanceId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch instance configuration
  const { data: config } = useQuery({
    queryKey: ['evolution-config', instanceId],
    queryFn: async () => {
      if (!instanceId) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('base_url, instance_id')
        .eq('instance_id', instanceId)
        .single();
      
      if (error) throw error;
      return data || { base_url: 'https://api.evoapicloud.com', instance_id: instanceId };
    },
    enabled: !!instanceId
  });

  // Fetch instance details
  const { data: instanceInfo } = useQuery<InstanceInfo>({
    queryKey: ['instance-info', instanceId],
    queryFn: async () => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      // Now using edge function to fetch instances
      const { data, error } = await supabase.functions.invoke('integrations', {
        method: 'GET'
      });
      
      if (error) throw new Error('Failed to fetch instance info');
      
      return data.find((inst: any) => inst.instance?.instanceId === instanceId);
    },
    enabled: !!config && !!instanceId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch chats
  const { data: chats } = useQuery<Chat[]>({
    queryKey: ['chats', instanceId],
    queryFn: async () => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      const { data, error } = await supabase.functions.invoke('integrations/chat/findChats', {
        body: { instanceId }
      });
      
      if (error) throw new Error('Failed to fetch chats');
      
      return data?.map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.id,
        lastMessage: chat.lastMessage ? {
          content: chat.lastMessage.content,
          timestamp: chat.lastMessage.timestamp
        } : undefined
      })) || [];
    },
    enabled: !!config && !!instanceId,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch messages for a specific chat
  const useMessages = (chatId: string | null) => {
    return useQuery<Message[]>({
      queryKey: ['messages', instanceId, chatId],
      queryFn: async () => {
        if (!config || !instanceId || !chatId) throw new Error('Missing required parameters');
        
        const { data, error } = await supabase.functions.invoke('integrations/chat/findMessages', {
          body: { 
            instanceId,
            chatId 
          }
        });
        
        if (error) throw new Error('Failed to fetch messages');
        
        return data?.messages?.map((msg: any) => ({
          key: msg.key.id,
          id: msg.key.id,
          content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
          fromMe: msg.key.fromMe,
          timestamp: msg.messageTimestamp,
          sender: msg.key.participant || msg.key.remoteJid
        })) || [];
      },
      enabled: !!config && !!instanceId && !!chatId,
      refetchInterval: 5000 // Refresh every 5 seconds
    });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: string; message: string }) => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      // Send message using our edge function
      const { data, error } = await supabase.functions.invoke('integrations/message/sendText', {
        body: {
          instanceId,
          number: chatId,
          text: message
        }
      });
      
      if (error) throw new Error('Failed to send message');
      
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch messages for the chat
      queryClient.invalidateQueries({
        queryKey: ['messages', instanceId, variables.chatId]
      });
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message: " + error.message,
        variant: "destructive"
      });
    }
  });

  return {
    instanceInfo,
    chats,
    useMessages,
    sendMessage,
    isConfigured: !!config
  };
}
