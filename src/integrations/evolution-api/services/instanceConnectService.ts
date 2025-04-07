import { supabase } from "@/integrations/supabase/client";
import type { ConnectionState } from "../types"; // Correct path now

/**
 * Connects to a specific Evolution API instance via a Supabase function
 * to get QR code or pairing code.
 */
export async function connectToInstance(
  setQrCodeBase64: (qrCode: string | null) => void,
  setPairingCode: (code: string | null) => void,
  setConnectionState: (state: ConnectionState) => void,
  startPolling: () => void,
  instanceId: string
): Promise<{ success: boolean; qrCodeDataUrl?: string | null; pairingCode?: string | null }> {
  if (!instanceId) {
    console.error("Instance ID is required to connect.");
    throw new Error("Instance ID is required.");
  }

  console.log(`Frontend: Requesting connection for instance ${instanceId} via Supabase function...`);

  try {
    // Call the Supabase function to handle the connection
    const { data: result, error } = await supabase.functions.invoke('integrations/connect-whatsapp', {
      body: { instanceId }
    });

    if (error) {
      console.error('Error invoking Supabase function integrations/connect-whatsapp:', error);
      throw new Error(`Failed to invoke connection function: ${error.message}`);
    }

    console.log('Frontend: Received response from Supabase function:', result);

    // Check the structure of the response from the Supabase function
    // The Supabase function directly returns the Evolution API response
    if (result && (result.base64 || result.pairingCode)) { // Check for base64 (QR) or pairingCode
      const qrCodeDataUrl = result.base64 ? `data:image/png;base64,${result.base64}` : null;
      const pairingCode = result.pairingCode || null;

      if (qrCodeDataUrl) {
        console.log('QR code generated successfully.');
        setQrCodeBase64(qrCodeDataUrl);
      }

      if (pairingCode) {
        console.log('Pairing code generated:', pairingCode);
        setPairingCode(pairingCode);
      }

      setConnectionState('connecting'); // Set state to connecting as QR/Pairing code is received

      // Start polling for connection status (e.g., checking if user scanned the code)
      startPolling();

      return {
        success: true,
        qrCodeDataUrl: qrCodeDataUrl,
        pairingCode: pairingCode
      };
    } else {
      // Handle cases where the Evolution API might not return QR/pairing code immediately
      // or if the response structure is different than expected.
      console.warn('Connection initiated, but no QR code or pairing code received immediately.', result);
      // Depending on Evolution API behavior, might still need to poll or handle other states.
      // For now, assume failure if no code is received in this initial response.
      setConnectionState('close'); // Set state to closed as connection didn't fully establish
      return { success: false };
    }
  } catch (err) {
    console.error('Error during connectToInstance service call:', err);
    setConnectionState('close'); // Set state to closed on error
    // Rethrow or handle the error appropriately for the UI
    // Attempt to parse the detailed error from the Supabase function response
    let detailedError = 'Unknown error during connection service call.';
    if (err instanceof Error) {
      detailedError = err.message; // Default to the basic error message
      // Supabase function errors often have context or originalError properties
      // Let's try to access the underlying error details if they exist
      const functionError = (err as any).context || (err as any).originalError || err;
      if (functionError?.message) {
        detailedError = functionError.message;
      }
      // Sometimes the error message might be JSON stringified in the message
      try {
        const parsedMessage = JSON.parse(detailedError);
        if (parsedMessage.error) {
          detailedError = parsedMessage.error;
        }
      } catch (parseError) {
        // Ignore if it's not JSON
      }
    }
    
    // Log the potentially more detailed error to the browser console
    console.error('Detailed error from connectToInstance service:', detailedError, err); 
    
    setConnectionState('close'); // Set state to closed on error
    // Rethrow the original error to maintain existing error handling flow in hooks
    throw err; 
  }
}
