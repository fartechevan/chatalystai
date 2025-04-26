import { supabase } from '@/integrations/supabase/client';

/**
 * Represents a configured integration instance, including the base integration details.
 */
export interface ConfiguredIntegration {
  id: string; // UUID from the 'integrations_config' table (the specific instance)
  instance_display_name: string | null; // User-defined name for this specific instance
  base_integration_id: string; // UUID from the 'integrations' table (the type, e.g., WhatsApp)
  name: string; // Name from the 'integrations' table (e.g., "WhatsApp")
  // Add other relevant fields if needed
}

/**
 * Fetches all configured integration instances for the user/organization.
 */
export const listIntegrations = async (): Promise<ConfiguredIntegration[]> => {
  console.log('Fetching configured integrations...');

  // Fetch configured integrations joined with the base integration details
  const { data, error } = await supabase
    .from('integrations_config')
    .select(`
      id,
      instance_display_name,
      integrations ( id, name )
    `)
    // TODO: Add filtering based on user/organization if necessary
    // e.g., .eq('user_id', userId) - Need to determine ownership logic
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching configured integrations:', error);
    throw new Error(`Failed to fetch configured integrations: ${error.message}`);
  }

  // Transform the data to match the ConfiguredIntegration interface
  // The join syntax returns nested objects, so we need to flatten it and ensure types.
  const configuredIntegrations = data
     .map(item => {
       // Type guard to ensure integrations object and its properties exist
       const baseIntegration = item.integrations as { id: string; name: string } | null;
       if (!baseIntegration) {
         console.warn(`Integration config ${item.id} missing base integration details.`);
         return null; // Skip this item if base integration data is missing
       }
       return {
         id: item.id, // This is the integrations_config ID
         instance_display_name: item.instance_display_name,
         base_integration_id: baseIntegration.id, // This is the integrations ID
         name: baseIntegration.name, // This is the integrations name
       };
     })
     .filter((item): item is ConfiguredIntegration => item !== null); // Filter out null items


  console.log('Fetched configured integrations:', configuredIntegrations);
  return configuredIntegrations;
};

// Add other integration-related functions as needed (get, create, update, delete)
