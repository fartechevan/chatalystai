
import { supabase } from "@/integrations/supabase/client";
import { formatQrCodeUrl } from "../utils/formatters";
import type { ToasterToast } from "@/hooks/use-toast";
import type { WhatsAppConfig } from "../types";

interface ConnectionResult {
  success: boolean;
  qrCodeDataUrl?: string;
  pairingCode?: string;
  error?: string;
}

export async function initializeConnection(
  config: WhatsAppConfig,
  toast: (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => void
): Promise<ConnectionResult> {
  try {
    // Try to get saved instance info from localStorage
    const savedInstanceStr = localStorage.getItem('whatsapp_instance');
    let instanceId = config.instance_id;
    let apiKey = '';
    
    if (savedInstanceStr) {
      try {
        const savedInstance = JSON.parse(savedInstanceStr);
        instanceId = savedInstance.id;
        apiKey = savedInstance.token;
        console.log('Using saved instance:', instanceId);
      } catch (e) {
        console.error('Error parsing saved instance:', e);
      }
    }
    
    if (!instanceId) {
      throw new Error('No WhatsApp instance ID found. Please try connecting again.');
    }
    
    console.log(`Initializing WhatsApp connection for instance: ${instanceId}`);
    
    // Call the direct Evolution API endpoint through our edge function
    const { data, error } = await supabase.functions.invoke('integrations/instance/connect', {
      body: { 
        instanceId,
        apiKey
      }
    });
    
    if (error) {
      console.error('Error initializing WhatsApp connection:', error);
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
    
    console.log('Connection initialization response:', data);
    
    if (!data || (!data.qrcode && !data.base64 && !data.pairingCode)) {
      console.error('Invalid response data:', data);
      toast({
        title: "Connection Error",
        description: "Invalid response from server",
        variant: "destructive",
      });
      return { success: false, error: "Invalid response from server" };
    }
    
    // Get the QR code from the response
    const qrCodeBase64 = data.qrcode || data.base64 || null;
    const pairingCode = data.pairingCode || null;
    
    if (!qrCodeBase64 && !pairingCode) {
      console.error('No QR code or pairing code in response');
      toast({
        title: "Connection Error",
        description: "No QR code or pairing code received",
        variant: "destructive",
      });
      return { success: false, error: "No QR code or pairing code received" };
    }
    
    // Format the QR code URL if needed
    const formattedQrCode = qrCodeBase64 ? formatQrCodeUrl(qrCodeBase64) : null;
    
    console.log('Successfully generated QR code or pairing code');
    
    if (pairingCode) {
      toast({
        title: "Pairing Code",
        description: `Enter this code on your phone: ${pairingCode}`,
      });
    }
    
    return {
      success: true,
      qrCodeDataUrl: formattedQrCode,
      pairingCode
    };
  } catch (error: any) {
    console.error('Error in initializeConnection:', error);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to initialize WhatsApp connection",
      variant: "destructive",
    });
    return { success: false, error: error.message };
  }
}
