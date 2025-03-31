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
      
      // First get the configuration for this instance
      const { data: instanceConfig, error: configError } = await supabase
        .from('integrations_config')
        .select('integration_id, instance_id')
        .eq('instance_id', instanceId)
        .single();
      
      if (configError) throw configError;
      
      // Then get the base_url from the integration
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('base_url')
        .eq('id', instanceConfig.integration_id)
        .single();
      
      if (integrationError) throw integrationError;
      
      return { 
        base_url: integration.base_url, 
        instance_id: instanceId,
        integration_id: instanceConfig.integration_id
      };
    },
    enabled: !!instanceId
  });

  // Fetch instance details
  const { data: instanceInfo } = useQuery<InstanceInfo>({
    queryKey: ['instance-info', instanceId],
    queryFn: async () => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      // TODO: Replace with local whatsapp/services function (e.g., fetchInstanceInfoService)
      // const { data, error } = await supabase.functions.invoke('integrations', {
      //   method: 'GET'
      // });
      const data: unknown[] = []; const error = new Error("Supabase function call commented out."); // Placeholder

      if (error) throw new Error('Failed to fetch instance info');
      
      // Placeholder return - adjust based on actual service implementation
      // Define a placeholder type for the instance structure within the array
      type PlaceholderInstance = { instance?: { instanceId?: string } };
      const foundInstance = data.find((inst: PlaceholderInstance) => inst.instance?.instanceId === instanceId);
      // Cast null to satisfy the InstanceInfo type expected by useQuery
      return (foundInstance as InstanceInfo) || null; 
    },
    enabled: !!config && !!instanceId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch chats
  const { data: chats } = useQuery<Chat[]>({
    queryKey: ['chats', instanceId],
    queryFn: async () => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      // TODO: Replace with local whatsapp/services function (e.g., findChatsService)
      // const { data, error } = await supabase.functions.invoke('integrations/chat/findChats', {
      //   body: { instanceId }
      // });
      const data: unknown[] = []; const error = new Error("Supabase function call commented out."); // Placeholder
      
      if (error) throw new Error('Failed to fetch chats');
      
      // Placeholder return - adjust based on actual service implementation
      // Define a placeholder type for the chat structure within the array
      type PlaceholderChat = { id: string; name?: string; lastMessage?: { content: string; timestamp: string } };
      return data?.map((chat: PlaceholderChat) => ({
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
        
        // TODO: Replace with local whatsapp/services function (e.g., findMessagesService)
        // const { data, error } = await supabase.functions.invoke('integrations/chat/findMessages', {
        //   body: {
        //     instanceId,
      //     chatId
      //   }
      // });
      const data: { messages: unknown[] } | null = { messages: [] }; const error = new Error("Supabase function call commented out."); // Placeholder

      if (error) throw new Error('Failed to fetch messages');

        // Placeholder return - adjust based on actual service implementation
        // Define a placeholder type for the message structure within the array
        type PlaceholderMsg = {
          key: { id?: string; fromMe?: boolean; participant?: string; remoteJid?: string };
          message?: { conversation?: string; extendedTextMessage?: { text?: string } };
          messageTimestamp?: number;
        };
        return data?.messages?.map((msg: PlaceholderMsg) => ({
          key: msg.key?.id || '', // Use optional chaining and provide default
          id: msg.key?.id || '', // Use optional chaining and provide default
          content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '', // Use optional chaining and provide default
          fromMe: msg.key?.fromMe || false, // Use optional chaining and provide default
          timestamp: msg.messageTimestamp || 0, // Use optional chaining and provide default
          sender: msg.key?.participant || msg.key?.remoteJid || '' // Use optional chaining and provide default
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
      
      // TODO: Replace with local whatsapp/services function (e.g., sendTextService)
      // const { data, error } = await supabase.functions.invoke('integrations/message/sendText', {
      //   body: {
      //     instanceId,
      //     number: chatId,
      //     text: message
      //   }
      // });
      const data = null; const error = new Error("Supabase function call commented out."); // Placeholder

      if (error) throw new Error('Failed to send message');

      // Placeholder return - adjust based on actual service implementation
      return data; // Returning null as placeholder
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
