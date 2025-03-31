
import { getEvolutionApiKey, evolutionServerUrl } from "../services/config";
import { getSavedInstanceData } from "./instanceStorage";
import type { ConnectionState } from "../types";

/**
 * Check the status of a WhatsApp instance
 */
export async function checkInstanceStatus(
  setConnectionState?: (state: ConnectionState) => void,
  setQrCodeBase64?: (url: string | null) => void
) {
  // Get the instance ID from local storage
  const savedData = getSavedInstanceData();
  const instanceId = savedData?.id;

  if (!instanceId) {
    console.error('No instance ID found in storage');
    if (setConnectionState) setConnectionState('not_configured');
    return { state: 'not_configured', error: 'No instance ID found' };
  }

  try {
    const apiKey = await getEvolutionApiKey();
    
    if (!apiKey) {
      console.error("No API key available for status check");
      if (setConnectionState) setConnectionState('error');
      return { state: 'error', error: 'No API key available' };
    }

    const endpoint = `/instance/connectionState/${instanceId}`;
    const url = `${evolutionServerUrl}${endpoint}`;

    console.log(`Checking connection state for instance ${instanceId}...`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
    });
    
    if (!response.ok) {
      console.error(`Error checking instance status (${response.status}):`, await response.text());
      if (setConnectionState) setConnectionState('error');
      return { state: 'error', error: `HTTP error ${response.status}` };
    }

    const data = await response.json();
    console.log('Instance status response:', data);

    if (data && data.state) {
      const connectionState = data.state as ConnectionState;
      console.log(`WhatsApp instance ${instanceId} state:`, connectionState);
      
      if (setConnectionState) setConnectionState(connectionState);
      
      // Clear QR code when connected
      if (connectionState === 'open' && setQrCodeBase64) {
        setQrCodeBase64(null);
      }
      
      return { state: connectionState };
    }
    
    console.error('Invalid state data received:', data);
    if (setConnectionState) setConnectionState('error');
    return { state: 'error', error: 'Invalid state data received' };
  } catch (error) {
    console.error('Error checking WhatsApp instance status:', error);
    if (setConnectionState) setConnectionState('error');
    return { state: 'error', error: String(error) };
  }
}
