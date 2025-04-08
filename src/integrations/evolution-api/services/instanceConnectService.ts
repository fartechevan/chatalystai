import type { ConnectionState } from "../types";

/**
 * Connects to a specific Evolution API instance directly
 * to get QR code or pairing code, using the instance's specific token.
 */
export async function connectToInstance(
  setQrCodeBase64: (qrCode: string | null) => void,
  setPairingCode: (code: string | null) => void,
  setConnectionState: (state: ConnectionState) => void,
  startPolling: () => void,
  instanceId: string,
  instanceToken: string, // Changed from integrationId
  baseUrl: string // Assuming baseUrl is still needed and perhaps fetched elsewhere or passed in
): Promise<{ success: boolean; qrCodeDataUrl?: string | null; pairingCode?: string | null }> {
  if (!instanceId) {
    console.error("Instance ID is required to connect.");
    throw new Error("Instance ID is required.");
  }
  if (!instanceToken) { // Check for instanceToken instead
    console.error("Instance Token is required for authentication.");
    throw new Error("Instance Token is required.");
  }
   if (!baseUrl) { // Check for baseUrl
    console.error("Base URL is required to connect.");
    throw new Error("Base URL is required.");
  }


  console.log(`Frontend: Requesting connection for instance ${instanceId}...`); // Removed integrationId log

  try {
    // 1. Construct the Evolution API URL (baseUrl needs to be available)
    const apiUrl = `${baseUrl}/instance/connect/${instanceId}`;
    console.log(`Frontend: Connecting directly to Evolution API: ${apiUrl}`);

    // 2. Make the direct request to the Evolution API using instanceToken
    const evoResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": instanceToken, // Use the passed instanceToken
      },
    });

    // 3. Check if the Evolution API request was successful
    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`Frontend: Evolution API request failed with status ${evoResponse.status}. Response body: ${errorText}`);
      // Throw an error to be caught by the catch block
      throw new Error(`Evolution API Error (${evoResponse.status}): ${errorText}`);
    }

    // 4. Parse the JSON response from Evolution API
    const result = await evoResponse.json();
    console.log('Frontend: Received response directly from Evolution API:', result);

    // 5. Process QR code/Pairing code, checking multiple possible locations for QR base64
    // Prioritize direct 'base64' field, then nested 'qrcode.base64'
    const qrCodeBase64Raw = result?.base64 || result?.qrcode?.base64;
    const pairingCode = result?.pairingCode || null; // Pairing code is usually top-level

    if (qrCodeBase64Raw || pairingCode) {
      // Ensure the data URL prefix exists if we have a base64 string
      const qrCodeDataUrl = qrCodeBase64Raw
        ? (qrCodeBase64Raw.startsWith('data:image/png;base64,') ? qrCodeBase64Raw : `data:image/png;base64,${qrCodeBase64Raw}`)
        : null;

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
      console.warn('Connection initiated, but no QR code (base64) or pairing code found directly in the result.', result);
      setConnectionState('close');
      return { success: false };
    }
  } catch (err) {
    // Error handling remains largely the same, but remove references to integrationId if any
    console.error('Error during connectToInstance service call:', err);
    let detailedError = 'Unknown error during connection service call.';
     if (err instanceof Error) {
       detailedError = err.message;
       // Attempt to parse more specific error details
       try {
         const parsedMessage = JSON.parse(detailedError);
         if (parsedMessage.error) {
           detailedError = parsedMessage.error;
         }
       } catch (parseError) { /* Ignore */ }
     }
    console.error('Detailed error from connectToInstance service:', detailedError, err);
    setConnectionState('close');
    throw err; // Rethrow the original error
  }
}
