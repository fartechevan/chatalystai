
import { getEvolutionApiKey, evolutionServerUrl } from "./config";

/**
 * Fetch all instances from the Evolution API
 */
export default async function fetchInstances() {
  try {
    const apiKey = await getEvolutionApiKey();
    
    if (!apiKey) {
      console.error("No API key available in vault for fetching instances");
      return { error: "No API key available in Supabase Vault" };
    }

    const endpoint = "/instance/fetchInstances";
    const url = `${evolutionServerUrl}${endpoint}`;
    
    console.log("Fetching all instances from Evolution API...");
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Error fetching instances (${response.status}):`, await response.text());
      return { error: `Error ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    console.log("Fetched instances:", data);
    
    if (Array.isArray(data)) {
      return data;
    }
    
    return { error: "Invalid response format" };
  } catch (error) {
    console.error("Error fetching WhatsApp instances:", error);
    return { error: String(error) };
  }
}
