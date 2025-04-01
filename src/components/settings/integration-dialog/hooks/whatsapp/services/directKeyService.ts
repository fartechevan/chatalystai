
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the Evolution API key directly from the edge function
 */
export async function getDirectApiKey(): Promise<string> {
  try {
    console.log("Attempting to fetch Evolution API key via Edge Function...");
    
    const { data, error } = await supabase.functions.invoke('get-evolution-key');
    
    if (error) {
      console.error("Error invoking get-evolution-key function:", error);
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }
    
    if (!data || !data.data) {
      console.error("API key not found in edge function response");
      throw new Error("API key not found in response");
    }
    
    // Store the key in database for future use
    await storeApiKey(data.data);
    
    console.log("Successfully retrieved API key from Edge Function");
    return data.data;
  } catch (e) {
    console.error("Exception fetching Evolution API key from Edge Function:", e);
    throw e;
  }
}

/**
 * Stores the API key in the integrations_config table
 */
export async function storeApiKey(apiKey: string): Promise<boolean> {
  try {
    console.log("Storing API key in integrations_config table...");
    
    // First check if there's already a record
    const { data, error: checkError } = await supabase
      .from('integrations_config')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (checkError) {
      console.error("Error checking existing records:", checkError);
      return false;
    }
    
    if (data && data.length > 0) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('integrations_config')
        .update({ api_key: apiKey })
        .eq('id', data[0].id);
        
      if (updateError) {
        console.error("Error updating API key:", updateError);
        return false;
      }
      
      console.log("Successfully updated API key in database");
      return true;
    } else {
      // Create new record
      // First try to get a WhatsApp integration ID
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('id')
        .eq('name', 'WhatsApp')
        .limit(1);
        
      if (integrationError) {
        console.error("Error fetching WhatsApp integration:", integrationError);
      }
      
      // Insert new record
      const { error: insertError } = await supabase
        .from('integrations_config')
        .insert({ 
          api_key: apiKey,
          integration_id: integrationData && integrationData.length > 0 ? integrationData[0].id : null,
          instance_id: 'default'
        });
        
      if (insertError) {
        console.error("Error inserting API key:", insertError);
        return false;
      }
      
      console.log("Successfully inserted API key in database");
      return true;
    }
  } catch (error) {
    console.error("Exception storing API key:", error);
    return false;
  }
}

/**
 * Get current API key from temporary storage
 */
export function getCurrentApiKey(): string | null {
  return localStorage.getItem('temp_evolution_api_key');
}

/**
 * Save temporary API key
 */
export function setCurrentApiKey(apiKey: string): void {
  localStorage.setItem('temp_evolution_api_key', apiKey);
}
