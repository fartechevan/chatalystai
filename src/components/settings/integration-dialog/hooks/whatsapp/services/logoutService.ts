
import { evolutionServerUrl, WHATSAPP_INSTANCE, getEvolutionApiKey } from "./config";

/**
 * Logs out from a WhatsApp instance
 * 
 * @param instanceName The name of the instance to log out from
 * @param onSuccess Callback function to execute on successful logout
 * @param options Additional options 
 * @returns Boolean indicating success
 */
export const logoutWhatsAppInstance = async (
  instanceName: string,
  onSuccess?: () => void,
  options?: { toast?: any }
) => {
  console.log(`Attempting to logout WhatsApp instance: ${instanceName}`);

  try {
    // Get the API key
    const apiKey = await getEvolutionApiKey();
    if (!apiKey) {
      console.error("Failed to retrieve Evolution API key for logout");
      options?.toast?.toast({
        title: "Error",
        description: "Could not retrieve API key for logout",
        variant: "destructive"
      });
      return false;
    }

    // Get the base URL
    const baseUrl = evolutionServerUrl;
    if (!baseUrl) {
      console.error("Evolution API base URL is not configured for logout");
      options?.toast?.toast({
        title: "Error",
        description: "API URL not configured",
        variant: "destructive"
      });
      return false;
    }

    // Construct the logout URL
    const logoutUrl = `${baseUrl}/instance/logout/${instanceName}`;
    console.log(`Sending logout request to: ${logoutUrl}`);

    // Send the logout request
    const response = await fetch(logoutUrl, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey
      }
    });

    // Handle the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error logging out: ${response.status} - ${errorText}`);
      options?.toast?.toast({
        title: "Logout Failed",
        description: `Server error: ${response.status}`,
        variant: "destructive"
      });
      return false;
    }

    // Parse the response and check for success
    const data = await response.json();
    console.log("Logout response:", data);

    if (data.error) {
      console.error("Error in logout response:", data.error);
      options?.toast?.toast({
        title: "Logout Failed",
        description: data.error,
        variant: "destructive"
      });
      return false;
    }

    // Handle successful logout
    console.log("Logout successful");
    
    // Remove the local storage item
    localStorage.removeItem(WHATSAPP_INSTANCE);
    
    // Call the success callback if provided
    if (onSuccess) {
      onSuccess();
    }
    
    // Show success toast if toast is provided
    options?.toast?.toast({
      title: "Logged Out",
      description: `Successfully disconnected ${instanceName}`
    });
    
    return true;
  } catch (error) {
    console.error("Exception during logout:", error);
    options?.toast?.toast({
      title: "Logout Error",
      description: error.message,
      variant: "destructive"
    });
    return false;
  }
};
