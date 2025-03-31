
import { evolutionServerUrl, getEvolutionApiKey } from "./config";

/**
 * Generate a QR code for connecting to a WhatsApp instance.
 * 
 * @param instanceName The name of the instance to connect to
 * @param apiKey Optional API key to use (will retrieve from config if not provided)
 * @returns Object with success status and QR code data URL
 */
export const handleQRCodeGeneration = async (
  instanceName: string,
  providedApiKey?: string | null
) => {
  try {
    // Use provided API key or get it from config
    const apiKey = providedApiKey || await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key for QR code generation");
      return { success: false, error: "API key not available" };
    }

    const baseUrl = evolutionServerUrl;
    const qrCodeUrl = `${baseUrl}/instance/qrcode/${instanceName}`;
    
    console.log(`Fetching QR code from: ${qrCodeUrl}`);
    
    const response = await fetch(qrCodeUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Error fetching QR code: ${response.status}`);
      return { success: false, error: `HTTP error ${response.status}` };
    }

    const data = await response.json();
    console.log("QR code response received:", data);

    if (data.qrcode) {
      return { 
        success: true, 
        qrCodeDataUrl: data.qrcode 
      };
    } else if (data.error) {
      console.error("Error in QR code response:", data.error);
      return { success: false, error: data.error };
    } else {
      console.error("No QR code in response");
      return { success: false, error: "No QR code returned" };
    }
  } catch (error) {
    console.error("Exception in handleQRCodeGeneration:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate a pairing code for connecting to a WhatsApp instance (for iPhone support).
 * 
 * @param instanceName The name of the instance to connect to
 * @param apiKey Optional API key to use (will retrieve from config if not provided)
 * @returns Object with success status and pairing code
 */
export const handlePairingCodeGeneration = async (
  instanceName: string,
  providedApiKey?: string | null
) => {
  try {
    // Use provided API key or get it from config
    const apiKey = providedApiKey || await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key for pairing code generation");
      return { success: false, error: "API key not available" };
    }

    const baseUrl = evolutionServerUrl;
    const pairingUrl = `${baseUrl}/instance/pairingCode/${instanceName}`;
    
    console.log(`Fetching pairing code from: ${pairingUrl}`);
    
    const response = await fetch(pairingUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Error fetching pairing code: ${response.status}`);
      return { success: false, error: `HTTP error ${response.status}` };
    }

    const data = await response.json();
    console.log("Pairing code response:", data);

    if (data.code) {
      return { 
        success: true, 
        pairingCode: data.code 
      };
    } else if (data.error) {
      console.error("Error in pairing code response:", data.error);
      return { success: false, error: data.error };
    } else {
      console.error("No pairing code in response");
      return { success: false, error: "No pairing code returned" };
    }
  } catch (error) {
    console.error("Exception in handlePairingCodeGeneration:", error);
    return { success: false, error: error.message };
  }
};
