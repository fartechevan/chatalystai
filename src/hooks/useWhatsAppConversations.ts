
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppConversations(instanceId: string | null, isConnected: boolean) {
  return useQuery({
    queryKey: ['whatsapp-conversations', instanceId, isConnected],
    queryFn: async () => {
      if (!instanceId) throw new Error('No instance ID provided');
      
      // First get the configuration and base_url for the WhatsApp instance
      const { data: config, error: configError } = await supabase
        .from('integrations_config')
        .select('integration_id')
        .eq('instance_id', instanceId)
        .single();
      
      if (configError) {
        console.error('Error fetching WhatsApp configuration:', configError);
        throw new Error('Failed to fetch WhatsApp configuration');
      }
      
      // Then get the integration to get the base_url
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('base_url')
        .eq('id', config.integration_id)
        .single();
      
      if (integrationError) {
        console.error('Error fetching integration details:', integrationError);
        throw new Error('Failed to fetch integration details');
      }
      
      const baseUrl = integration?.base_url || 'https://api.evoapicloud.com';
      console.log('Using base URL:', baseUrl);

      // TODO: Replace with local whatsapp/services function (e.g., findMessagesService or findConversationsService)
      // const { data, error } = await supabase.functions.invoke('integrations/chat/findMessages', {
      //   body: { instanceId }
      // });
      const data: unknown = []; const error = new Error("Supabase function call commented out."); // Placeholder
      
      if (error) {
        console.error('Failed to fetch WhatsApp conversations:', error);
        throw new Error(`Failed to fetch WhatsApp conversations: ${error.message}`);
      }

      console.log('WhatsApp conversation data:', data);
      return data;
    },
    enabled: !!instanceId && isConnected,
    refetchInterval: isConnected ? 10000 : false, // Refetch every 10 seconds when connected
    retry: 3,
    retryDelay: 1000,
  });
}
