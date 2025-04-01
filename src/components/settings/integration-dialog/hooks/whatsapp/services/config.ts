
// Central configuration for WhatsApp services
import { supabase } from "@/integrations/supabase/client";

// Function to get the API key from Supabase
export async function getEvolutionApiKey(): Promise<string> {
  try {
    // Use the correct argument type for the RPC function
    const { data, error } = await supabase.rpc('get_evolution_api_key', {});
    
    if (error) {
      console.error("Error fetching Evolution API key:", error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    if (!data) {
      console.error("API key is empty in vault");
      throw new Error("API key is empty in vault");
    }
    
    console.log("Successfully retrieved API key from vault");
    // Ensure we're returning a string
    return data as string;
  } catch (e) {
    console.error("Exception fetching Evolution API key:", e);
    throw e;
  }
}

// Set up a global API key variable that will be initialized asynchronously
let evolutionApiKey = "";

// Initialize the API key
(async () => {
  try {
    evolutionApiKey = await getEvolutionApiKey();
    console.log("Evolution API key successfully retrieved from vault.");
  } catch (error) {
    console.error("CRITICAL: EVOLUTION_API_KEY could not be retrieved from vault. WhatsApp integration may not function.", error);
  }
})();

// Export the key for other services to use
export { evolutionApiKey };

// Define and export the base URL
const EVOLUTION_SERVER_URL = "https://api.evoapicloud.com";
if (!EVOLUTION_SERVER_URL) {
    console.error("CRITICAL: EVOLUTION_SERVER_URL is not set. WhatsApp integration may not function.");
}
export const evolutionServerUrl = EVOLUTION_SERVER_URL || ""; // Fallback

// LocalStorage Keys
export const WHATSAPP_INSTANCE = 'whatsapp_instance'; // Renamed constant
