
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Integration } from "../../types";
import { useState, useEffect } from "react";

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ['integration-config', selectedIntegration?.id],
    queryFn: async () => {
      if (!selectedIntegration?.id) return null;
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('integration_id', selectedIntegration.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedIntegration?.id,
  });

  const initializeConnection = async () => {
    if (!config) {
      toast({
        title: "Configuration Error",
        description: "Integration configuration not found",
        variant: "destructive",
      });
      return false;
    }

    try {
      const response = await fetch(`${config.base_url}/instance/connect/${config.instance_id}`, {
        headers: {
          'apikey': config.api_key,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to WhatsApp');
      }

      const data = await response.json();
      console.log('WhatsApp connection response:', data);

      // Extract QR code from the response and ensure proper formatting
      if (data.qrcode?.base64?.value) {
        const base64Value = data.qrcode.base64.value;
        // Check if the value already includes the data URL prefix
        const qrCodeDataUrl = base64Value.startsWith('data:image/')
          ? base64Value
          : `data:image/png;base64,${base64Value}`;
        
        console.log('Formatted QR code URL:', qrCodeDataUrl);
        setQrCodeBase64(qrCodeDataUrl);
        return true;
      } else {
        console.error('QR code data not found in response:', data);
        toast({
          title: "QR Code Error",
          description: "Failed to get QR code from WhatsApp",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to initialize WhatsApp connection",
        variant: "destructive",
      });
      console.error('WhatsApp connection error:', error);
      return false;
    }
  };

  useEffect(() => {
    return () => {
      setQrCodeBase64(null);
    };
  }, []);

  return { initializeConnection, qrCodeBase64 };
}
