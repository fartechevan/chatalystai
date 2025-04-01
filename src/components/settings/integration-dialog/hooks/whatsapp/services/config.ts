// Central configuration for WhatsApp services

// API Key (Consider moving to environment variables for better security)
const EVOLUTION_API_KEY = "d20770d7-312f-499a-b841-4b64a243f24c";
if (!EVOLUTION_API_KEY) {
  console.error("CRITICAL: EVOLUTION_API_KEY is not set. WhatsApp integration may not function.");
  // Depending on requirements, you might throw an error here
  // throw new Error("EVOLUTION_API_KEY is not defined");
}

// Export the key for other services to use
// Provide a fallback empty string if not set to avoid undefined errors at runtime
export const evolutionApiKey = EVOLUTION_API_KEY || "";

// Define and export the base URL
const EVOLUTION_SERVER_URL = "https://api.evoapicloud.com";
if (!EVOLUTION_SERVER_URL) {
    console.error("CRITICAL: EVOLUTION_SERVER_URL is not set. WhatsApp integration may not function.");
    // throw new Error("EVOLUTION_SERVER_URL is not defined");
}
export const evolutionServerUrl = EVOLUTION_SERVER_URL || ""; // Fallback

// LocalStorage Keys
export const WHATSAPP_INSTANCE = 'whatsapp_instance'; // Renamed constant

// Example of getting from Vite env vars (commented out)
// const VITE_EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;
// const VITE_EVOLUTION_SERVER_URL = import.meta.env.VITE_EVOLUTION_SERVER_URL;
