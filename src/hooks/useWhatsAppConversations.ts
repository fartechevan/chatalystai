
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppConversations(instanceId: string | null, isConnected: boolean) {
  return useQuery({
    queryKey: ['whatsapp-conversations', instanceId, isConnected],
    queryFn: async () => {
      if (!instanceId) throw new Error('No instance ID provided');
      
      // First get the configuration for the WhatsApp instance
      const { data: config, error: configError } = await supabase
        .from('integrations_config')
        .select('base_url')
        .eq('instance_id', instanceId)
        .single();
      
      if (configError) {
        console.error('Error fetching WhatsApp configuration:', configError);
        throw new Error('Failed to fetch WhatsApp configuration');
      }
      
      const baseUrl = config?.base_url || 'https://api.evoapicloud.com';
      console.log('Using base URL:', baseUrl);

      // Fetch conversations from Evolution API
      const response = await fetch(`${baseUrl}/chat/findMessages/${instanceId}`, {
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY || '',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch WhatsApp conversations:', response.status, response.statusText);
        throw new Error(`Failed to fetch WhatsApp conversations: ${response.status}`);
      }

      const data = await response.json();
      console.log('WhatsApp conversation data:', data);
      return data;
    },
    enabled: !!instanceId && isConnected,
    refetchInterval: isConnected ? 10000 : false, // Refetch every 10 seconds when connected
    retry: 3,
    retryDelay: 1000,
  });
}
