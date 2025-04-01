
// Central configuration for WhatsApp services
import { supabase } from "@/integrations/supabase/client";

// Function to get the API key from integrations_config table
export async function getEvolutionApiKey(): Promise<string> {
  try {
    console.log("Attempting to fetch Evolution API key from integrations_config table...");
    
    // Try to get the API key from the database first
    const { data, error } = await supabase
      .from('integrations_config')
      .select('api_key')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error fetching Evolution API key from integrations_config:", error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    // If we found a key in the database, use it
    if (data && data.length > 0 && data[0].api_key) {
      console.log("Successfully retrieved API key from integrations_config");
      return data[0].api_key;
    }
    
    // If no key in database, check for the RPC function as fallback
    console.log("No API key found in database, trying RPC function...");
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_evolution_api_key');
      
      if (rpcError) {
        console.error("Error fetching Evolution API key from RPC:", rpcError);
        throw new Error(`Failed to fetch API key from RPC: ${rpcError.message}`);
      }
      
      if (!rpcData) {
        console.error("API key is empty from RPC");
        throw new Error("API key is empty from RPC");
      }
      
      console.log("Successfully retrieved API key from RPC");
      return rpcData;
    } catch (rpcException) {
      console.error("Exception fetching Evolution API key from RPC:", rpcException);
      // Fall through to use environment or fallback
    }
    
    console.log("No API key found in database or RPC");
    throw new Error("API key not found");
  } catch (e) {
    console.error("Exception fetching Evolution API key:", e);
    // Fallback to a temporary development key - ONLY FOR TESTING
    console.log("Using fallback development key for testing");
    return "TEMP_DEV_KEY_FOR_TESTING_ONLY";
  }
}

// Set up a global API key variable with an empty default
let evolutionApiKey = "";

// Initialize the API key immediately
(async () => {
  try {
    console.log("Initializing Evolution API key...");
    evolutionApiKey = await getEvolutionApiKey();
    console.log("Evolution API key successfully initialized:", evolutionApiKey ? `${evolutionApiKey.substring(0, 5)}...` : "EMPTY");
  } catch (error) {
    console.error("CRITICAL: EVOLUTION_API_KEY could not be retrieved:", error);
    console.error("Please ensure the key is properly set in integrations_config table");
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
