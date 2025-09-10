import { supabase } from '@/integrations/supabase/client';
import { fetchEvolutionInstances } from './fetchInstancesService';
import { getEvolutionWebhook } from './getWebhookService';
import { setEvolutionWebhook } from './setWebhookService';
import { toast } from '@/components/ui/use-toast';

interface WebhookRefreshResult {
  totalInstances: number;
  configuredInstances: number;
  newlyConfigured: number;
  errors: string[];
}

/**
 * Refreshes webhook configuration for all Evolution API instances.
 * Fetches all instances, checks their webhook status, and configures webhooks for those that don't have them.
 * @param integrationId - The ID of the integration to process.
 * @returns A promise resolving to the refresh results.
 */
export async function refreshWebhookSetup(integrationId: string): Promise<WebhookRefreshResult> {
  const result: WebhookRefreshResult = {
    totalInstances: 0,
    configuredInstances: 0,
    newlyConfigured: 0,
    errors: []
  };

  if (!integrationId) {
    result.errors.push('Missing integration ID');
    return result;
  }

  try {
    console.log(`[RefreshWebhook] Starting webhook refresh for integration: ${integrationId}`);

    // 1. Get integration webhook configuration
    const { data: integrationData, error: integrationError } = await supabase
      .from('integrations')
      .select('webhook_url, webhook_events')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integrationData) {
      result.errors.push(`Failed to fetch integration details: ${integrationError?.message || 'No data'}`);
      return result;
    }

    if (!integrationData.webhook_url || !Array.isArray(integrationData.webhook_events) || integrationData.webhook_events.length === 0) {
      result.errors.push('Integration webhook URL or events not configured');
      return result;
    }

    // 2. Get all integration configs for this integration
    const { data: configsData, error: configsError } = await supabase
      .from('integrations_config')
      .select('id, instance_display_name, instance_id')
      .eq('integration_id', integrationId);

    if (configsError) {
      result.errors.push(`Failed to fetch integration configs: ${configsError.message}`);
      return result;
    }

    if (!configsData || configsData.length === 0) {
      console.log(`[RefreshWebhook] No integration configs found for integration: ${integrationId}`);
      return result;
    }

    // 3. Fetch all Evolution instances
    const instances = await fetchEvolutionInstances(integrationId);
    if (!instances || instances.length === 0) {
      console.log(`[RefreshWebhook] No Evolution instances found for integration: ${integrationId}`);
      return result;
    }

    result.totalInstances = instances.length;
    console.log(`[RefreshWebhook] Found ${instances.length} instances`);

    // 4. Process each instance
    for (const instance of instances) {
      try {
        // Find matching config for this instance
        const instanceName = instance.name || instance.id || '';
        const matchingConfig = configsData.find(config => 
          config.instance_display_name === instanceName ||
          config.instance_id === instanceName
        );

        if (!matchingConfig) {
          console.warn(`[RefreshWebhook] No config found for instance: ${instanceName}`);
          continue;
        }

        // Check current webhook configuration
        const currentWebhook = await getEvolutionWebhook(integrationId, instanceName);
        
        if (currentWebhook && currentWebhook.enabled && currentWebhook.url) {
          console.log(`[RefreshWebhook] Instance ${instanceName} already has webhook configured`);
          result.configuredInstances++;
          continue;
        }

        // Configure webhook for this instance
        console.log(`[RefreshWebhook] Configuring webhook for instance: ${instanceName}`);
        
        const webhookUrlWithConfig = `${integrationData.webhook_url}?config=${matchingConfig.id}`;
        const success = await setEvolutionWebhook(
          integrationId,
          instanceName,
          webhookUrlWithConfig,
          integrationData.webhook_events as string[]
        );

        if (success) {
          result.newlyConfigured++;
          console.log(`[RefreshWebhook] Successfully configured webhook for instance: ${instanceName}`);
        } else {
          result.errors.push(`Failed to configure webhook for instance: ${instanceName}`);
        }

      } catch (instanceError) {
        const instanceName = instance.name || instance.id || 'unknown';
        const errorMessage = `Error processing instance ${instanceName}: ${instanceError instanceof Error ? instanceError.message : 'Unknown error'}`;
        console.error(`[RefreshWebhook] ${errorMessage}`);
        result.errors.push(errorMessage);
      }
    }

    console.log(`[RefreshWebhook] Refresh complete. Total: ${result.totalInstances}, Configured: ${result.configuredInstances}, Newly configured: ${result.newlyConfigured}, Errors: ${result.errors.length}`);
    
    return result;

  } catch (error) {
    const errorMessage = `Webhook refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[RefreshWebhook] ${errorMessage}`);
    result.errors.push(errorMessage);
    return result;
  }
}

/**
 * Refreshes webhook setup and shows appropriate toast notifications.
 * @param integrationId - The ID of the integration to process.
 */
export async function refreshWebhookSetupWithToast(integrationId: string): Promise<void> {
  const result = await refreshWebhookSetup(integrationId);
  
  if (result.errors.length > 0) {
    toast({
      title: "Webhook Refresh Errors",
      description: `${result.errors.length} error(s) occurred. Check console for details.`,
      variant: "destructive"
    });
  } else if (result.newlyConfigured > 0) {
    toast({
      title: "Webhooks Configured",
      description: `Successfully configured webhooks for ${result.newlyConfigured} instance(s).`,
    });
  } else if (result.totalInstances > 0) {
    toast({
      title: "Webhooks Up to Date",
      description: `All ${result.configuredInstances} instance(s) already have webhooks configured.`,
    });
  } else {
    toast({
      title: "No Instances Found",
      description: "No Evolution API instances found to configure.",
      variant: "destructive"
    });
  }
}