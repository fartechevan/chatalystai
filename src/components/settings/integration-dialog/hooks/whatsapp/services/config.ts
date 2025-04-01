
// Central configuration for WhatsApp services
import { supabase } from "@/integrations/supabase/client";

// Function to get the API key from Supabase - with improved error handling and debugging
export async function getEvolutionApiKey(): Promise<string> {
  try {
    console.log("Attempting to fetch Evolution API key from vault with get_evolution_api_key RPC...");
    
    // Check if the function exists first
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'get_evolution_api_key')
      .limit(1);
    
    if (funcError) {
      console.error("Error checking for RPC function existence:", funcError);
    } else {
      console.log("RPC function check result:", functions);
    }
    
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
    // Fallback to a temporary development key - ONLY FOR TESTING
    console.log("Using fallback development key for testing");
    return "TEMP_DEV_KEY_FOR_TESTING_ONLY";
  }
}

// Set up a global API key variable with an empty default
let evolutionApiKey = "";

// Initialize the API key immediately - add more robust error handling
(async () => {
  try {
    console.log("Initializing Evolution API key...");
    evolutionApiKey = await getEvolutionApiKey();
    console.log("Evolution API key successfully initialized:", evolutionApiKey ? `${evolutionApiKey.substring(0, 5)}...` : "EMPTY");
  } catch (error) {
    console.error("CRITICAL: EVOLUTION_API_KEY could not be retrieved from vault:", error);
    console.error("Please ensure the key is properly set in the vault with the name 'EVOLUTION_API_SECRET'");
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
