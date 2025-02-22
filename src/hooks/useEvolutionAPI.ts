
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
    queryKey: ['evolution-config'],
    queryFn: async () => {
      if (!instanceId) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('instance_id', instanceId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!instanceId
  });

  // Fetch instance details
  const { data: instanceInfo } = useQuery<InstanceInfo>({
    queryKey: ['instance-info', instanceId],
    queryFn: async () => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      const response = await fetch(`${config.base_url}/instance/fetchInstances`, {
        headers: { 'apikey': config.api_key },
      });
      
      if (!response.ok) throw new Error('Failed to fetch instance info');
      
      const data = await response.json();
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
      
      const response = await fetch(`${config.base_url}/chat/findChats/${instanceId}`, {
        headers: { 'apikey': config.api_key },
      });
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const data = await response.json();
      return data.map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.id,
        lastMessage: chat.lastMessage ? {
          content: chat.lastMessage.content,
          timestamp: chat.lastMessage.timestamp
        } : undefined
      }));
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
        
        const response = await fetch(`${config.base_url}/chat/findMessages/${instanceId}/${chatId}`, {
          headers: { 'apikey': config.api_key },
        });
        
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        return data.messages.map((msg: any) => ({
          key: msg.key.id,
          id: msg.key.id,
          content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
          fromMe: msg.key.fromMe,
          timestamp: msg.messageTimestamp,
          sender: msg.key.participant || msg.key.remoteJid
        }));
      },
      enabled: !!config && !!instanceId && !!chatId,
      refetchInterval: 5000 // Refresh every 5 seconds
    });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: string; message: string }) => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      const response = await fetch(`${config.base_url}/message/sendText/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.api_key
        },
        body: JSON.stringify({
          number: chatId,
          text: message
        })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      return response.json();
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
