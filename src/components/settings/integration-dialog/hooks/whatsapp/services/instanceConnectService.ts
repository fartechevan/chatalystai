
import { supabase } from "@/integrations/supabase/client";
// Import the centralized API key and server URL
import { evolutionApiKey, evolutionServerUrl } from "./config";

/**
 * Connects to a specific Evolution API instance to get QR code or pairing code.
 */
export async function connectToInstance(
  setQrCodeBase64: (qrCode: string | null) => void,
  setPairingCode: (code: string | null) => void,
  setConnectionState: (state: string) => void,
  startPolling: () => void,
  // Remove apiKey parameter
  instanceId: string
) {

  // Use the imported server URL
  const baseUrl = evolutionServerUrl;
  if (!baseUrl) {
     console.error("Evolution API base URL is not configured.");
     throw new Error("Evolution API base URL is not configured.");
  }

  // API Key check
  if (!evolutionApiKey) {
    console.error('API key is missing from config.');
    throw new Error('API key is required for connection.');
  }

  // Create full URL for API call
  const apiUrl = `${baseUrl}/instance/connect/${instanceId}`;

  console.log(`Connecting to instance via Evolution API: ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey, // Use imported key
    }
  });
  
  if (!response.ok) {
    console.error(`Instance connection failed with status: ${response.status}`);
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error(`Failed to connect: ${response.statusText}`);
  }
  
  const result = await response.json();

  if (result.success) {
    if (result.qrCodeDataUrl) {
      console.log('QR code generated successfully:', result.qrCodeDataUrl);
      // Assuming setQrCodeBase64 is a function to handle QR code data
      setQrCodeBase64(result.qrCodeDataUrl);
    }
    
    if (result.pairingCode) {
      console.log('Pairing code generated:', result.pairingCode);
      // Assuming setPairingCode is a function to handle pairing code
      setPairingCode(result.pairingCode);
    }
    
    setConnectionState('connecting');
    
    // Start polling for connection status
    startPolling();
    return {
      success: true,
      qrCodeDataUrl: result.qrCodeDataUrl || null,
      pairingCode: result.pairingCode || null
    };
  } else {
    return false;
  }
}
