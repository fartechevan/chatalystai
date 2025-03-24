
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key');
  Deno.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Helper function to fetch integration config
export async function getIntegrationConfig(integrationId = 'bda44db7-4e9a-4733-a9c7-c4f5d7198905') {
  const { data: integration, error: integrationError } = await supabaseClient
    .from('integrations_config')
    .select('instance_id, base_url')
    .eq('id', integrationId)
    .single();

  if (integrationError) {
    console.error('Error fetching integration config:', integrationError);
    throw new Error('Failed to fetch integration configuration');
  }

  if (!integration) {
    console.error('Integration config not found');
    throw new Error('Integration configuration not found');
  }

  return integration;
}

// Verify Evolution API key is available
export function verifyEvolutionApiKey() {
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!apiKey) {
    console.error('EVOLUTION_API_KEY environment variable is not set');
    throw new Error('Evolution API Key is not configured');
  }
  return true;
}

// Save or update integration config from instances data
export async function saveIntegrationConfigFromInstances(integrationId: string, instances: any[]) {
  try {
    console.log('Saving integration config from instances data:', {
      integrationId, 
      instances: Array.isArray(instances) ? instances.length : 'not an array'
    });
    
    if (!Array.isArray(instances) || instances.length === 0) {
      console.log('No instances to save');
      return;
    }
    
    // Process each instance
    for (const instance of instances) {
      // Extract user_reference_id from ownerJid if available
      const userReferenceId = instance.owner?.id || 
                              instance.owner?.jid || 
                              instance.ownerJid || 
                              instance.phone || 
                              '';
      
      console.log('Processing instance:', {
        instanceId: instance.id,
        userReferenceId,
        connectionStatus: instance.connectionStatus || instance.status
      });
      
      // Check if there's already a config for this instance
      const { data: existingConfig } = await supabaseClient
        .from('integrations_config')
        .select('id')
        .eq('instance_id', instance.id)
        .maybeSingle();
      
      if (existingConfig) {
        // Update existing config
        console.log('Updating existing config for instance:', instance.id);
        const { error: updateError } = await supabaseClient
          .from('integrations_config')
          .update({
            user_reference_id: userReferenceId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);
        
        if (updateError) {
          console.error('Error updating integration config:', updateError);
        }
      } else {
        // Create new config for this instance
        console.log('Creating new config for instance:', instance.id);
        const { error: insertError } = await supabaseClient
          .from('integrations_config')
          .insert({
            integration_id: integrationId,
            instance_id: instance.id,
            user_reference_id: userReferenceId,
            base_url: 'https://api.evoapicloud.com'
          });
        
        if (insertError) {
          console.error('Error creating integration config:', insertError);
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving integration config:', error);
    throw error;
  }
}
