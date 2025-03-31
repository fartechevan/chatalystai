
import { evolutionServerUrl, getEvolutionApiKey } from "./config";

/**
 * Send a text message via WhatsApp
 * 
 * @param instanceId The ID of the WhatsApp instance
 * @param to The recipient phone number
 * @param message The message to send
 * @returns Object with success status and any data or error
 */
export async function sendTextMessage(instanceId: string, to: string, message: string) {
  try {
    // Get API key
    const apiKey = await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key for sending message");
      return { success: false, error: "API key not available" };
    }

    const baseUrl = evolutionServerUrl;
    if (!baseUrl) {
      console.error("Evolution API base URL is not configured");
      return { success: false, error: "API URL not configured" };
    }

    // Format the recipient number if needed
    const recipient = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    
    // Build send message URL
    const sendUrl = `${baseUrl}/message/sendText/${instanceId}`;
    console.log(`Sending message to ${recipient} via: ${sendUrl}`);

    // Send request
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200
        },
        textMessage: {
          text: message
        }
      })
    });

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error sending message: ${response.status} - ${errorText}`);
      return { success: false, error: `Server error: ${response.status}` };
    }

    // Parse response
    const data = await response.json();
    console.log("Message send response:", data);

    if (data.error) {
      console.error("Error in message send response:", data.error);
      return { success: false, error: data.error };
    }

    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error(`Exception sending message to ${to} on instance ${instanceId}:`, error);
    return { success: false, error: error.message };
  }
}
