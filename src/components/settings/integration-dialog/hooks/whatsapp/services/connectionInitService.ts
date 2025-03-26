
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
    
    // Prepare the request body
    const requestBody = { 
      instanceId,
      apiKey
    };
    console.log('Request body for edge function:', JSON.stringify(requestBody, null, 2));
    
    // Call the direct Evolution API endpoint through our edge function
    console.log('Invoking edge function: integrations/instance/connect');
    
    try {
      const response = await supabase.functions.invoke('integrations/instance/connect', {
        body: requestBody
      });
      
      // Log full response for debugging
      console.log('Full Edge Function response:', JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error('Error from edge function:', response.error);
        console.error('Error name:', response.error.name);
        console.error('Error message:', response.error.message);
        console.error('Error stack:', response.error.stack);
        console.error('Response data:', response.data);
        
        // Special handling for FunctionsHttpError - try to get detailed error from the response
        if (response.error.name === 'FunctionsHttpError') {
          // Try the alternative approach with direct fetch to the edge function 
          console.log('Attempting direct fetch to edge function as fallback');
          
          const directUrl = `${window.location.origin}/.netlify/functions/index?api=integrations/instance/connect`;
          
          // Get current session token for auth - Fix for the TypeScript error
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token || '';
          
          console.log('Direct fetch to edge function with auth token:', accessToken ? 'Available (truncated)' : 'Not available');
          
          const directResponse = await fetch(directUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!directResponse.ok) {
            console.error(`Direct fetch failed with status: ${directResponse.status}`);
            throw new Error(`Failed to connect: ${directResponse.statusText}`);
          }
          
          const directData = await directResponse.json();
          console.log('Direct fetch response:', directData);
          
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
          }
        }
        
        toast({
          title: "Connection Error",
          description: response.error.message || "Failed to connect",
          variant: "destructive",
        });
        return { success: false, error: response.error.message };
      }
      
      const { data } = response;
      console.log('Connection initialization response data:', JSON.stringify(data, null, 2));
      
      // If data contains an error field, handle it
      if (data && data.error) {
        console.error('Error from Evolution API:', data.error);
        console.error('Error details:', data.details);
        toast({
          title: "Connection Error",
          description: data.error,
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }
      
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
      console.log('Formatted QR code available:', !!formattedQrCode);
      console.log('Pairing code available:', !!pairingCode);
      
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
    } catch (fetchError) {
      console.error('Error calling edge function:', fetchError);
      toast({
        title: "Connection Error",
        description: fetchError.message || "Failed to connect to server",
        variant: "destructive",
      });
      return { success: false, error: fetchError.message };
    }
  } catch (error) {
    console.error('Uncaught error in initializeConnection:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to initialize WhatsApp connection",
      variant: "destructive",
    });
    return { success: false, error: error.message };
  }
}
