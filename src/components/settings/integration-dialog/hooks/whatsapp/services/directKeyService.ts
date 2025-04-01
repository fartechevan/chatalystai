
import { supabase } from "@/integrations/supabase/client";

/**
 * Direct service to get the Evolution API key from the Edge Function
 */
export async function getDirectApiKey(): Promise<string> {
  try {
    console.log("Attempting to fetch Evolution API key directly via Edge Function...");
    
    const { data, error } = await supabase.functions.invoke('get-evolution-key', {
      method: 'GET'
    });
    
    if (error) {
      console.error("Error fetching Evolution API key from Edge Function:", error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    if (!data || !data.data) {
      console.error("API key is empty in response from Edge Function");
      throw new Error("API key is empty in response");
    }
    
    console.log("Successfully retrieved API key from Edge Function");
    return data.data as string;
  } catch (e) {
    console.error("Exception fetching Evolution API key from Edge Function:", e);
    throw e;
  }
}

/**
 * Alternative approach to update the API key in memory
 */
export async function refreshApiKey(): Promise<void> {
  try {
    console.log("Refreshing API key...");
    const key = await getDirectApiKey();
    if (key) {
      // Update localStorage with the key for temporary usage
      localStorage.setItem('temp_evolution_api_key', key);
      console.log("API key refreshed and stored temporarily");
    }
  } catch (error) {
    console.error("Failed to refresh API key:", error);
  }
}

/**
 * Get the API key from memory/localStorage
 */
export function getCurrentApiKey(): string | null {
  return localStorage.getItem('temp_evolution_api_key');
}
