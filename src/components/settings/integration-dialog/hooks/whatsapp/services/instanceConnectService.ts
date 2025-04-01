import { supabase } from "@/integrations/supabase/client"; // Removed getEvolutionURL
// Import only the server URL
import { evolutionServerUrl } from "./config";

/**
 * Connects to a specific Evolution API instance to get QR code.
 * Pairing code functionality has been removed.
 */
export async function connectToInstance(
  setQrCodeBase64: (qrCode: string | null) => void,
  // setPairingCode parameter removed
  setConnectionState: (state: string) => void,
  startPolling: () => void,
  apiKey: string, // Added apiKey parameter
  instanceId: string
) {

  // Use the imported server URL
  const baseUrl = evolutionServerUrl;
  if (!baseUrl) {
     console.error("Evolution API base URL is not configured.");
     throw new Error("Evolution API base URL is not configured.");
  }

  // API Key check (now using the passed parameter)
  if (!apiKey) {
    console.error('API key was not provided to connectToInstance.');
    throw new Error('API key is required for connection.');
  }

  // Get current session token for auth (if still needed by API) - Likely not needed
  // const { data: sessionData } = await supabase.auth.getSession();
  // const accessToken = sessionData?.session?.access_token || '';

  // Create full URL for API call
  const apiUrl = `${baseUrl}/instance/connect/${instanceId}`;

  console.log(`Connecting to instance via Evolution API: ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      // 'Content-Type': 'application/json', // Removed Content-Type header
      'apikey': apiKey, // Use passed apiKey parameter
      // 'Authorization': `Bearer ${accessToken}` // Remove if not needed
    }
  });

  if (!response.ok) {
    console.error(`Instance connection failed with status: ${response.status}`);
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error(`Failed to connect: ${response.statusText}`);
  }

  const result = await response.json();

  // Attempt to extract QR code data, checking both possible locations
  let qrCodeDataUrl: string | null = null;
  if (result.base64) {
    qrCodeDataUrl = result.base64; // Try direct access first
  } else if (result.qrcode && result.qrcode.base64) {
    qrCodeDataUrl = result.qrcode.base64; // Fallback to nested property
  }

  if (qrCodeDataUrl) {
    console.log('QR code generated successfully.');
    setQrCodeBase64(qrCodeDataUrl);

    // Pairing code logic removed

    setConnectionState('connecting');

    // Start polling for connection status
    startPolling();
    // Return success true and the extracted QR code data
    return {
      success: true,
      qrCodeDataUrl: qrCodeDataUrl,
      pairingCode: null // Always return null for pairingCode
    };
  } else {
    // If neither location contained the base64 data, consider it a failure
    console.error("API response did not contain expected QR code (base64) in either result.base64 or result.qrcode.base64. Response:", result);
    return false;
  }
}
