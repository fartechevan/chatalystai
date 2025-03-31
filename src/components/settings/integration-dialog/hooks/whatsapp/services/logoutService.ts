
import { getEvolutionApiKey, evolutionServerUrl } from "./config";
import { useToast } from "@/hooks/use-toast";

/**
 * Log out from a WhatsApp instance
 */
export async function logoutWhatsAppInstance(
  instanceName: string,
  onSuccess?: () => void,
  options?: { toast?: ReturnType<typeof useToast> }
) {
  const apiKey = await getEvolutionApiKey();
  
  if (!apiKey) {
    console.error("No API key available for logout");
    if (options?.toast) {
      options.toast.toast({
        title: "Error",
        description: "No API key available for logout",
        variant: "destructive"
      });
    }
    return false;
  }

  if (!instanceName) {
    console.error("No instance name provided for logout");
    if (options?.toast) {
      options.toast.toast({
        title: "Error",
        description: "No instance name provided for logout",
        variant: "destructive"
      });
    }
    return false;
  }

  try {
    const endpoint = `/instance/logout/${instanceName}`;
    const url = `${evolutionServerUrl}${endpoint}`;
    
    console.log(`Attempting to logout instance ${instanceName}`);
    
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error logging out (${response.status}):`, errorText);
      if (options?.toast) {
        options.toast.toast({
          title: "Logout Error",
          description: `Error ${response.status}: ${errorText || response.statusText}`,
          variant: "destructive"
        });
      }
      return false;
    }

    const data = await response.json();
    console.log("Logout response:", data);
    
    if (onSuccess) onSuccess();
    
    if (options?.toast) {
      options.toast.toast({
        title: "Logged Out",
        description: `Successfully disconnected WhatsApp instance ${instanceName}`,
      });
    }
    
    // Clear cached instance data from localStorage
    localStorage.removeItem('whatsapp_instance');
    
    return true;
  } catch (error) {
    console.error("Error logging out from WhatsApp instance:", error);
    if (options?.toast) {
      options.toast.toast({
        title: "Logout Error",
        description: `An unexpected error occurred: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
    return false;
  }
}
