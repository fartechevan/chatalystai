
// Central configuration for WhatsApp services
import { supabase } from "@/integrations/supabase/client";

// Function to get the API key from Supabase
async function getEvolutionApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_evolution_api_key');
    
    if (error) {
      console.error("Error fetching Evolution API key:", error);
      return "";
    }
    
    return data || "";
  } catch (e) {
    console.error("Exception fetching Evolution API key:", e);
    return "";
  }
}

// Initially set to empty, will be populated via the getEvolutionApiKey function
let evolutionApiKey = "";

// Initialize the API key
(async () => {
  evolutionApiKey = await getEvolutionApiKey();
  if (!evolutionApiKey) {
    console.error("CRITICAL: EVOLUTION_API_KEY could not be retrieved from vault. WhatsApp integration may not function.");
  } else {
    console.log("Evolution API key successfully retrieved from vault.");
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
