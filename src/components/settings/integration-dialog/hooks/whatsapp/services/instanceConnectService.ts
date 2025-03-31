
import { getEvolutionApiKey, evolutionServerUrl } from "../services/config";
import { useToast } from "@/hooks/use-toast";
import { processConnectionData } from "./qrHandlers";
import type { ConnectionState } from "../types";

/**
 * Connect to a WhatsApp instance
 */
export async function connectToInstance(
  setQrCodeBase64: (url: string | null) => void,
  setPairingCode: (code: string | null) => void,
  setConnectionState: (state: ConnectionState) => void,
  startPolling: () => void,
  instanceId: string
) {
  const apiKey = await getEvolutionApiKey();
  
  if (!apiKey) {
    console.error("Missing API key for Evolution API");
    return { success: false, error: "Missing API key for Evolution API" };
  }

  if (!instanceId) {
    console.error("Missing instance ID for Connection");
    return { success: false, error: "Missing instance ID" };
  }

  console.log(`Attempting to connect with API Key: ${apiKey ? "***" : "Not Set"}, Instance ID: ${instanceId}`);
  
  try {
    const endpoint = `/instance/connect/${instanceId}`;
    const url = `${evolutionServerUrl}${endpoint}`;
    
    console.log("Connection URL:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Error connecting to instance (${response.status}):`, await response.text());
      return { success: false, error: `Error ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    console.log("Connection response:", data);

    // Process QR code and update UI
    const toastFn = (props: any) => {
      const { toast } = useToast();
      toast(props);
    };

    const result = processConnectionData(data, toastFn);
    
    // Trigger polling to check connection status
    startPolling();
    
    return result;
  } catch (error) {
    console.error("Error connecting to WhatsApp instance:", error);
    return { success: false, error: String(error) };
  }
}
