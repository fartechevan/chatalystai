
// Central configuration for WhatsApp services

import { supabase } from "@/integrations/supabase/client";

// API Key (Retrieved from Supabase vault)
let EVOLUTION_API_KEY = "";

// Function to fetch the API key from the vault directly
export const getEvolutionApiKey = async (): Promise<string> => {
  try {
    if (EVOLUTION_API_KEY) return EVOLUTION_API_KEY;
    
    // Call the vault directly to retrieve the API key securely
    const { data, error } = await supabase.vault.get('EVOLUTION_API_KEY');
    
    if (error) {
      console.error("Failed to retrieve Evolution API key from vault:", error);
      throw error;
    }
    
    if (data) {
      EVOLUTION_API_KEY = data as string;
      return data as string;
    }
    
    return "";
  } catch (error) {
    console.error("Error retrieving Evolution API key from vault:", error);
    return "";
  }
};

// For backward compatibility, maintain the direct export (will be populated after first fetch)
export const evolutionApiKey = EVOLUTION_API_KEY;

// Define and export the base URL
const EVOLUTION_SERVER_URL = "https://api.evoapicloud.com";
if (!EVOLUTION_SERVER_URL) {
    console.error("CRITICAL: EVOLUTION_SERVER_URL is not set. WhatsApp integration may not function.");
}
export const evolutionServerUrl = EVOLUTION_SERVER_URL || ""; // Fallback

// LocalStorage Keys
export const WHATSAPP_INSTANCE = 'whatsapp_instance'; // Renamed constant
