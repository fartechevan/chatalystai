
import { supabase } from "@/integrations/supabase/client";
import { formatQrCodeUrl } from "../utils/formatters";
import type { WhatsAppConfig } from "../types";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ConnectionResult {
  success: boolean;
  qrCodeDataUrl?: string;
  pairingCode?: string;
  error?: string;
}

export async function initializeConnection(
  config: WhatsAppConfig,
  toast: (props: ToastProps) => void
): Promise<ConnectionResult> {
  try {
    console.log('initializeConnection called with config:', JSON.stringify(config, null, 2));
    
    // Try to get saved instance info from localStorage
    const savedInstanceStr = localStorage.getItem('whatsapp_instance');
    console.log('Raw saved instance from localStorage:', savedInstanceStr);
    
    let instanceId = config.instance_id;
    let apiKey = '';
    
    if (savedInstanceStr) {
      try {
        const savedInstance = JSON.parse(savedInstanceStr);
        console.log('Parsed saved instance:', savedInstance);
        instanceId = savedInstance.id;
        apiKey = savedInstance.token;
        console.log('Using saved instance ID:', instanceId);
        console.log('API Key retrieved from localStorage (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'none');
      } catch (e) {
        console.error('Error parsing saved instance:', e);
      }
    }
    
    if (!instanceId) {
      console.error('No WhatsApp instance ID found');
      throw new Error('No WhatsApp instance ID found. Please try connecting again.');
    }
    
    console.log(`Initializing WhatsApp connection for instance: ${instanceId}`);
    console.log(`API Key available: ${apiKey ? 'Yes (' + apiKey.substring(0, 5) + '...)' : 'No'}`);
    
    // Call the direct endpoint for connecting the WhatsApp instance
    try {
      console.log('Calling instance/connect endpoint directly');
      
      const response = await supabase.functions.invoke('integrations/instance/connect', {
        body: {
          instanceId,
          apiKey
        }
      });
      
      // Log full response for debugging
      console.log('Instance connect response:', JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error('Error from edge function:', response.error);
        toast({
          title: "Connection Error",
          description: response.error.message || "Failed to connect",
          variant: "destructive",
        });
        return { success: false, error: response.error.message };
      }
      
      const { data } = response;
      
      // Check if we received a QR code or pairing code from the Evolution API
      if (data && (data.qrcode || data.base64 || data.pairingCode)) {
        // We got a proper response with either QR code or pairing code
        const qrCodeBase64 = data.qrcode || data.base64 || null;
        const pairingCode = data.pairingCode || null;
        
        const formattedQrCode = qrCodeBase64 ? formatQrCodeUrl(qrCodeBase64) : null;
        
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
      } else {
        // The response doesn't have expected QR code format
        // Attempt to call the direct Evolution API endpoint as a fallback

        // Get current session token for auth
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        
        // Create base URL for direct Evolution API call
        const baseUrl = config.base_url || 'https://api.evoapicloud.com';
        const evolutionApiUrl = `${baseUrl}/instance/connect/${instanceId}`;
        
        console.log('Direct fetch to Evolution API:', evolutionApiUrl);
        
        const directResponse = await fetch(evolutionApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey || '',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({})
        });
        
        if (!directResponse.ok) {
          console.error(`Direct API call failed with status: ${directResponse.status}`);
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
          toast({
            title: "Connection Error",
            description: "Failed to connect to WhatsApp server",
            variant: "destructive",
          });
          return { success: false, error: `Failed to connect: ${directResponse.statusText}` };
        }
        
        const directData = await directResponse.json();
        console.log('Direct API response:', directData);
        
        // Process the successful response from direct fetch
        if (directData.qrcode || directData.base64 || directData.pairingCode) {
          const qrCodeBase64 = directData.qrcode || directData.base64 || null;
          const pairingCode = directData.pairingCode || null;
          
          const formattedQrCode = qrCodeBase64 ? formatQrCodeUrl(qrCodeBase64) : null;
          
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
        } else {
          console.error('No QR code or pairing code data returned from API');
          toast({
            title: "Connection Error",
            description: "Could not generate QR code or pairing code",
            variant: "destructive",
          });
          return { success: false, error: "No QR code or pairing code data returned" };
        }
      }
    } catch (apiError) {
      console.error('Error calling API:', apiError);
      toast({
        title: "Connection Error",
        description: apiError.message || "Failed to initialize WhatsApp connection",
        variant: "destructive",
      });
      return { success: false, error: apiError.message };
    }
  } catch (error) {
    console.error('Uncaught error in initializeConnection:', error);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to initialize WhatsApp connection",
      variant: "destructive",
    });
    return { success: false, error: error.message };
  }
}
