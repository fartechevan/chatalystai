
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
    .select('api_key, instance_id')
    .eq('id', integrationId)
    .single();

  if (integrationError) {
    console.error('Error fetching integration config:', integrationError);
    throw new Error('Failed to fetch integration configuration');
  }

  if (!integration || !integration.api_key) {
    console.error('Integration config not found or missing API key');
    throw new Error('Integration configuration not found or incomplete');
  }

  return integration;
}
