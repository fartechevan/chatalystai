
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Saves integration configuration from WhatsApp instances data
 */
export async function saveIntegrationConfigFromInstances(integrationId: string, instances: any[]) {
  if (!instances || !Array.isArray(instances) || instances.length === 0) {
    console.log('No instances provided, skipping database update');
    return;
  }
  
  console.log(`Saving ${instances.length} instances for integration ${integrationId}`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  for (const instance of instances) {
    try {
      const instanceId = instance.id || instance.instance?.instanceId;
      const ownerJid = instance.ownerJid || instance.owner || instance.instance?.owner;
      
      if (!instanceId) {
        console.warn('Missing instance ID, skipping record');
        continue;
      }
      
      console.log(`Processing instance ${instanceId} with owner ${ownerJid || 'unknown'}`);
      
      // Check if config already exists for this integration and instance
      const { data: existingConfig, error: checkError } = await supabase
        .from('integrations_config')
        .select('id')
        .eq('integration_id', integrationId)
        .eq('instance_id', instanceId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking for existing config:', checkError);
        continue;
      }
      
      const configData = {
        integration_id: integrationId,
        instance_id: instanceId,
        user_reference_id: ownerJid || null
      };
      
      let result;
      if (existingConfig) {
        // Update existing config
        result = await supabase
          .from('integrations_config')
          .update(configData)
          .eq('id', existingConfig.id);
        
        console.log(`Updated existing config for instance ${instanceId}`);
      } else {
        // Insert new config
        result = await supabase
          .from('integrations_config')
          .insert(configData);
        
        console.log(`Inserted new config for instance ${instanceId}`);
      }
      
      if (result.error) {
        console.error('Error saving integration config:', result.error);
      }
      
    } catch (error) {
      console.error('Error processing instance:', error);
    }
  }
  
  console.log('Finished saving integration configurations');
}
