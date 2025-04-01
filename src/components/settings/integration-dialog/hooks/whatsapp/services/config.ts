
// Central configuration for WhatsApp services
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// API Key - Hardcoded for development, should be moved to environment variables in production
const EVOLUTION_API_KEY = "d20770d7-312f-499a-b841-4b64a243f24c";
if (!EVOLUTION_API_KEY) {
  console.error("CRITICAL: EVOLUTION_API_KEY is not set. WhatsApp integration may not function.");
}

// Export the key for other services to use
export const evolutionApiKey = EVOLUTION_API_KEY || "";

// Define and export the base URL
const EVOLUTION_SERVER_URL = "https://api.evoapicloud.com";
if (!EVOLUTION_SERVER_URL) {
    console.error("CRITICAL: EVOLUTION_SERVER_URL is not set. WhatsApp integration may not function.");
}
export const evolutionServerUrl = EVOLUTION_SERVER_URL || ""; // Fallback

// LocalStorage Keys
export const WHATSAPP_INSTANCE = 'whatsapp_instance'; // Renamed constant
