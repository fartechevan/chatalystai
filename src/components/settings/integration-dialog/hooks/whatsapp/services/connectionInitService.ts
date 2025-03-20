
import { useToast } from "@/hooks/use-toast";
import { formatQrCodeUrl } from "../utils/formatters";

interface WhatsAppConfig {
  instance_id?: string;
  [key: string]: any;
}

interface ConnectionResult {
  success: boolean;
  qrCodeDataUrl?: string;
}

/**
 * Initialize a connection to WhatsApp and retrieve QR code
 */
export const initializeConnection = async (
  config: WhatsAppConfig | null,
  toast: ReturnType<typeof useToast>['toast']
): Promise<ConnectionResult> => {
  if (!config || !config.instance_id) {
    toast({
      title: "Configuration Error",
      description: "Instance ID is missing in the configuration",
      variant: "destructive",
    });
    return { success: false };
  }

  try {
    // Use edge function instead of direct API call
    const response = await fetch(`/api/functions/v1/integrations/instance/connect/${config.instance_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Try to get error message as text first
      let errorMessage = '';
      try {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || 'Unknown error';
        } else {
          // If not JSON, get as text
          errorMessage = await response.text();
        }
      } catch (parseError) {
        errorMessage = `Status: ${response.status} - Could not parse error response`;
      }
      
      console.error('WhatsApp connection error response:', errorMessage);
      throw new Error(`Failed to connect to WhatsApp: ${errorMessage}`);
    }

    // Verify we have JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const htmlResponse = await response.text();
      console.error('Invalid content type received:', contentType, 'Response:', htmlResponse);
      throw new Error('Received HTML instead of JSON from API');
    }

    const data = await response.json();
    console.log('WhatsApp connection response:', data);

    // Extract QR code from the response and ensure proper formatting
    if (data.qrcode?.base64) {
      const base64Value = data.qrcode.base64;
      const qrCodeDataUrl = formatQrCodeUrl(base64Value);
      return { success: true, qrCodeDataUrl };
    }
    else if (data.base64) {
      const base64Value = data.base64;
      const qrCodeDataUrl = formatQrCodeUrl(base64Value);
      return { success: true, qrCodeDataUrl };
    }
    else {
      console.error('QR code data not found in response:', data);
      toast({
        title: "QR Code Error",
        description: "Failed to get QR code from WhatsApp. Check console for details.",
        variant: "destructive",
      });
      return { success: false };
    }
  } catch (error) {
    console.error('WhatsApp connection error:', error);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to connect to WhatsApp",
      variant: "destructive",
    });
    return { success: false };
  }
};
