
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
