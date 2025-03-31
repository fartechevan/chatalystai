import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendTextMessage } from "@/components/settings/integration-dialog/hooks/whatsapp/services/sendTextService";
import { checkInstanceStatus } from "@/components/settings/integration-dialog/hooks/whatsapp/services/instanceStatusService";

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

  // Fetch instance details using our service
  const { data: instanceInfo } = useQuery<InstanceInfo>({
    queryKey: ['instance-info', instanceId],
    queryFn: async () => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      // Use our service instead of Supabase function
      const statusResult = await checkInstanceStatus();
      
      if (statusResult && 'error' in statusResult) {
        throw new Error(statusResult.error || 'Failed to fetch instance info');
      }
      
      // Return placeholder data - this would be expanded in a real implementation
      return {
        instance: {
          instanceId: instanceId,
          owner: "Owner",
          profileName: "WhatsApp Business",
          profilePictureUrl: "",
          phoneNumber: "",
          state: statusResult.state
        }
      };
    },
    enabled: !!config && !!instanceId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Send message mutation using our service
  const sendMessage = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: string; message: string }) => {
      if (!config || !instanceId) throw new Error('No configuration found');
      
      // Extract phone number without the @c.us suffix if present
      const phoneNumber = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      
      // Use our service instead of Supabase function
      const result = await sendTextMessage(instanceId, phoneNumber, message);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      return result.data;
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
    chats: [],
    useMessages: () => useQuery({ queryKey: ['messages'], queryFn: async () => [] }),
    sendMessage,
    isConfigured: !!config
  };
}
