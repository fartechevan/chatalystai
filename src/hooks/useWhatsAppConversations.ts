
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppConversations(instanceId: string | null, isConnected: boolean) {
  return useQuery({
    queryKey: ['whatsapp-conversations', instanceId],
    queryFn: async () => {
      if (!instanceId) throw new Error('No instance ID provided');
      
      // Get the configuration for the WhatsApp instance
      const { data: config } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('instance_id', instanceId)
        .single();
      
      if (!config) throw new Error('Configuration not found');

      // Fetch conversations from Evolution API
      const response = await fetch(`${config.base_url}/chat/findMessages/${instanceId}`, {
        headers: {
          'apikey': config.api_key,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch WhatsApp conversations');
      }

      const data = await response.json();
      return data;
    },
    enabled: !!instanceId && isConnected,
    refetchInterval: isConnected ? 10000 : false, // Refetch every 10 seconds when connected
  });
}
