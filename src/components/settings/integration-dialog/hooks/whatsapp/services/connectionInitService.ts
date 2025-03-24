
import { useToast } from "@/hooks/use-toast";
import { formatQrCodeUrl } from "../utils/formatters";

interface WhatsAppConfig {
  instance_id?: string;
  base_url?: string;
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
  if (!config) {
    toast({
      title: "Configuration Error",
      description: "WhatsApp configuration is missing",
      variant: "destructive",
    });
    return { success: false };
  }

  if (!config.instance_id) {
    toast({
      title: "Configuration Error",
      description: "Instance ID is missing in the configuration",
      variant: "destructive",
    });
    return { success: false };
  }

  try {
    console.log('Connecting to WhatsApp API with config:', config);
    
    // Use base URL from config
    const baseUrl = config.base_url || 'https://api.evoapicloud.com';
    
    // First check if the instance exists
    const statusResponse = await fetch(`${baseUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY || '',
      },
    });

    if (!statusResponse.ok) {
      console.error('Failed to check WhatsApp instances:', await statusResponse.text());
      throw new Error('Failed to check WhatsApp instances');
    }

    const instances = await statusResponse.json();
    console.log('Existing instances:', instances);

    // Check if our instance exists already
    const instanceExists = Array.isArray(instances) && 
      instances.some(inst => inst.id === config.instance_id);

    // If instance doesn't exist, create it first
    if (!instanceExists) {
      console.log('Instance not found, creating new instance:', config.instance_id);
      const createResponse = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY || '',
        },
        body: JSON.stringify({
          instanceName: config.instance_id,
          token: config.instance_id,
          qrcode: true
        }),
      });

      if (!createResponse.ok) {
        console.error('Failed to create instance:', await createResponse.text());
        throw new Error('Failed to create WhatsApp instance');
      }

      console.log('Instance created successfully');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay after creation
    }
    
    // Now connect to the instance
    const response = await fetch(`${baseUrl}/instance/connect/${config.instance_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY || '',
      },
    });

    // Debug response status
    console.log('WhatsApp API response status:', response.status);

    if (!response.ok) {
      // Try to get error message
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
      const textResponse = await response.text();
      console.error('Invalid content type received:', contentType, 'Response:', textResponse);
      throw new Error('Received non-JSON response from API');
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
    // If we have a qr property directly
    else if (data.qr) {
      const qrCodeDataUrl = formatQrCodeUrl(data.qr);
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
