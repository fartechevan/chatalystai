
import { evolutionServerUrl, getEvolutionApiKey } from "./config";
import { handleQRCodeGeneration, handlePairingCodeGeneration } from "./qrHandlers";
import type { ConnectionState } from "../types";
import { useToast } from "@/hooks/use-toast";

/**
 * Connect to a WhatsApp instance and retrieve the QR code for authentication.
 */
export const connectToInstance = async (
  setQrCodeBase64: (qrCode: string | null) => void,
  setPairingCode: (pairingCode: string | null) => void,
  setConnectionState: (state: ConnectionState) => void,
  startPolling: () => void,
  instanceName: string
) => {
  console.log("Starting connection to WhatsApp instance:", instanceName);
  
  try {
    // Get API key securely
    const apiKey = await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key from server");
      setConnectionState('error');
      return { success: false, error: "API key not available" };
    }

    const baseUrl = evolutionServerUrl;
    if (!baseUrl) {
      console.error("Evolution API base URL is not configured.");
      setConnectionState('error');
      return { success: false, error: "Base URL not configured" };
    }

    // First, check if the instance exists
    console.log(`Checking if instance ${instanceName} exists...`);
    const checkInstanceUrl = `${baseUrl}/instance/exists/${instanceName}`;
    
    const checkResponse = await fetch(checkInstanceUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });

    if (!checkResponse.ok) {
      console.error(`Error checking instance existence: ${checkResponse.status}`);
      setConnectionState('error');
      return { success: false, error: `HTTP error ${checkResponse.status}` };
    }

    const checkData = await checkResponse.json();
    console.log("Instance check response:", checkData);

    // If the instance doesn't exist, create it
    if (!checkData.exists) {
      console.log(`Instance ${instanceName} does not exist. Creating...`);
      const createInstanceUrl = `${baseUrl}/instance/create`;
      
      const createResponse = await fetch(createInstanceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          instanceName: instanceName
        })
      });

      if (!createResponse.ok) {
        console.error(`Error creating instance: ${createResponse.status}`);
        setConnectionState('error');
        return { success: false, error: `HTTP error ${createResponse.status}` };
      }

      const createData = await createResponse.json();
      console.log("Instance creation response:", createData);
    }

    // Now connect and get QR code or pairing code
    console.log(`Connecting to instance ${instanceName}...`);
    let qrCodeResult = await handleQRCodeGeneration(instanceName, apiKey);
    
    if (qrCodeResult.success) {
      setQrCodeBase64(qrCodeResult.qrCodeDataUrl || null);
      setConnectionState('connecting');
      startPolling();
      return { 
        success: true, 
        qrCodeDataUrl: qrCodeResult.qrCodeDataUrl
      };
    } else {
      console.warn("QR code generation failed, trying pairing code instead.");
      
      // Try to get pairing code as fallback
      let pairingCodeResult = await handlePairingCodeGeneration(instanceName, apiKey);
      
      if (pairingCodeResult.success) {
        setPairingCode(pairingCodeResult.pairingCode || null);
        setConnectionState('connecting');
        startPolling();
        return { 
          success: true, 
          pairingCode: pairingCodeResult.pairingCode
        };
      } else {
        console.error("Both QR code and pairing code generation failed.");
        setConnectionState('error');
        return { 
          success: false, 
          error: "Failed to generate authentication codes" 
        };
      }
    }
  } catch (error) {
    console.error("Error in connectToInstance:", error);
    setConnectionState('error');
    return { success: false, error: error.message };
  }
};
