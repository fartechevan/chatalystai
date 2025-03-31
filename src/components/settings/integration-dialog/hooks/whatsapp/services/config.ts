
// Central configuration for WhatsApp services

// Base URL for Evolution API
const EVOLUTION_SERVER_URL = "https://api.evoapicloud.com";
if (!EVOLUTION_SERVER_URL) {
    console.error("CRITICAL: EVOLUTION_SERVER_URL is not set. WhatsApp integration may not function.");
}

export const evolutionServerUrl = EVOLUTION_SERVER_URL || ""; // Fallback

// LocalStorage Keys
export const WHATSAPP_INSTANCE = 'whatsapp_instance'; // Renamed constant

// Function to get the API key from Supabase
export async function getEvolutionApiKey() {
  try {
    const { data, error } = await fetch('/api/evolution-api-key').then(res => res.json());
    
    if (error) {
      console.error("Error fetching Evolution API key:", error);
      return null;
    }
    
    return data?.apiKey || null;
  } catch (error) {
    console.error("Exception fetching Evolution API key:", error);
    return null;
  }
}
