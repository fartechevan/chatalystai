
import { getEvolutionApiKey, evolutionServerUrl } from "./config";
import type { WhatsAppMessageResponse } from "../../../../../dashboard/conversations/api/messageQueries/types";

/**
 * Sends a text message to a WhatsApp contact
 */
export async function sendTextMessage(
  instanceId: string,
  recipient: string,
  message: string
): Promise<WhatsAppMessageResponse> {
  try {
    const apiKey = await getEvolutionApiKey();
    
    if (!apiKey) {
      console.error("No API key available for sending message");
      return { success: false, error: "API key not available" };
    }

    if (!instanceId) {
      console.error("No instance ID provided for sending message");
      return { success: false, error: "Instance ID is required" };
    }

    // Extract phone number without the @c.us suffix if present
    const phoneNumber = recipient.includes('@') ? recipient.split('@')[0] : recipient;
    console.log('Phone number being sent to API:', phoneNumber);
    
    const endpoint = `/message/sendText/${instanceId}`;
    const url = `${evolutionServerUrl}${endpoint}`;
    
    console.log("Sending message URL:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        number: phoneNumber,
        options: {
          delay: 1200
        },
        textMessage: {
          text: message
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error sending message (${response.status}):`, errorText);
      return { success: false, error: `Error ${response.status}: ${errorText || response.statusText}` };
    }

    const data = await response.json();
    console.log("Send message response:", data);
    
    return { success: true, data };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: String(error) };
  }
}
