import { useState, useEffect, useCallback } from "react";
import { Integration } from "../../types";
// Remove useEvolutionApiConnection import as its state logic is merged here
// import { useEvolutionApiConnection } from "@/integrations/evolution-api/hooks/useEvolutionApiConnection";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionState, EvolutionInstance, ConnectInstanceResponse } from "@/integrations/evolution-api/types"; // Standardize import path
import { fetchEvolutionInstances } from "@/integrations/evolution-api/services/fetchInstancesService";
import { createEvolutionInstance } from "@/integrations/evolution-api/services/createInstanceService";
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials"; // Import getEvolutionCredentials
import { useEvolutionApiConfig } from "@/integrations/evolution-api/hooks/useEvolutionApiConfig";
import { connectToInstance as evolutionConnectToInstance } from "@/integrations/evolution-api/services/instanceConnectService";
import { setEvolutionWebhook } from "@/integrations/evolution-api/services/setWebhookService"; // Import the new service
import { checkInstanceStatus } from "@/integrations/evolution-api/services/instanceStatusService"; // Import checkInstanceStatus
import { toast } from "@/components/ui/use-toast"; // Import toast for error handling


// import { WebhookSetupForm } from "../components/WebhookSetupForm"; // Not used directly in this hook

// Helper type guard to check for error structure
interface ApiErrorWithMessage {
    message: string | string[];
}
function hasMessage(obj: unknown): obj is ApiErrorWithMessage {
    // Check if obj is an object and has a 'message' property that's string or string[]
    return typeof obj === 'object' &&
           obj !== null &&
           'message' in obj &&
           (typeof (obj as ApiErrorWithMessage).message === 'string' || Array.isArray((obj as ApiErrorWithMessage).message));
}

interface ApiErrorWithError {
    error: string;
}
function hasError(obj: unknown): obj is ApiErrorWithError {
     // Check if obj is an object and has an 'error' property that's a string
     return typeof obj === 'object' &&
            obj !== null &&
            'error' in obj &&
            typeof (obj as ApiErrorWithError).error === 'string';
}

interface ApiErrorWithResponse {
    response: { message?: string; error?: string };
}
function hasResponseError(obj: unknown): obj is ApiErrorWithResponse {
     // Check if obj is an object, has 'response' property which is also an object, and that object has message or error
     return typeof obj === 'object' &&
            obj !== null &&
            'response' in obj &&
            typeof (obj as { response: unknown }).response === 'object' && // Check if response exists and is object
            (obj as { response: unknown }).response !== null &&
            ('message' in ((obj as { response: unknown }).response as object) || // Check for message in response object
             'error' in ((obj as { response: unknown }).response as object));   // Check for error in response object
}


export function useIntegrationConnectionState(
  selectedIntegration: Integration | null,
  open: boolean,
  tenantId: string | null, // Added tenantId parameter
  onConnectionEstablished?: () => void // Make it optional for safety
) {
  useEffect(() => {
    console.log(`[DEBUG DUPLICATE CHECK][useIntegrationConnectionState] Hook initialized/props updated. tenantId prop value:`, tenantId);
  }, [tenantId]);
  const [integrationMainPopup, setIntegrationMainPopup] = useState(true);
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Represents if connection was ever 'open'
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrPollingInterval, setQrPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPollingForConnection, setIsPollingForConnection] = useState(false);

  const [fetchedInstances, setFetchedInstances] = useState<EvolutionInstance[]>([]);
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>(""); // Keep track of the instance being connected/managed
  const [newInstanceName, setNewInstanceName] = useState<string>("");
  const [currentPipelineId, setCurrentPipelineId] = useState<string | undefined>(undefined); // Add state to hold pipeline ID during connection

  const [showWebhookSetup, setShowWebhookSetup] = useState(false);
  const [pendingWebhookIntegrationId, setPendingWebhookIntegrationId] = useState<string | null>(null);

  // Integration limit states
  const [currentIntegrationCount, setCurrentIntegrationCount] = useState(0);
  const [maxIntegrationsAllowed, setMaxIntegrationsAllowed] = useState<number | null>(null);
  const [canAddMoreIntegrations, setCanAddMoreIntegrations] = useState(true); // Assume true until checked

  // Use config hook for base_url, token etc. needed for API calls
  const { config, isLoading: configLoading, refetch: refetchConfig } = useEvolutionApiConfig(selectedIntegration);

  // --- State Management ---
  const [localConnectionState, setLocalConnectionState] = useState<ConnectionState>('unknown');
  const [isLoading, setIsLoading] = useState(false); // Combined loading state

  // Define valid connection states explicitly
  const validConnectionStates: ConnectionState[] = ['open', 'connecting', 'close', 'qrcode', 'pairingCode', 'idle', 'unknown'];

  // Helper to check if a status is a valid ConnectionState
  const isValidConnectionState = (status: string | undefined): status is ConnectionState => {
    return !!status && validConnectionStates.includes(status as ConnectionState);
  };


  // --- Function Definitions (Moved Up) ---

  const updateIntegrationStatus = useCallback(async (integrationId: string) => {
    // Simplified: just ensures record exists, might need more logic
   try {
     const { data: existingConfig, error: checkError } = await supabase
       .from('integrations_config')
       .select('id')
       .eq('integration_id', integrationId)
       .maybeSingle();

     if (checkError) throw checkError;

     if (!existingConfig) {
       console.log(`[updateIntegrationStatus] No config found for ${integrationId}, inserting default with integration_id and null status.`);
       const { error: insertError } = await supabase
         .from('integrations_config')
         .insert({ integration_id: integrationId, status: null }); // Insert only valid columns
       if (insertError) throw insertError;
     }
   } catch (error) {
     console.error('Error ensuring integration status record:', error);
   }
 }, []); // No dependencies needed as it uses only integrationId


  const fetchAndUpdateDetails = useCallback(async (integrationId: string) => {
    console.log(`[fetchAndUpdateDetails] Starting for integration ${integrationId}`);
    try {
      console.log(`[fetchAndUpdateDetails] Integration ID: ${integrationId}`);
      const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
      console.log(`[fetchAndUpdateDetails] apiKey: ${apiKey ? 'Exists' : 'Missing'}, baseUrl: ${baseUrl}`); // Avoid logging key

      // Use maybeSingle() to handle cases where the config row might not exist yet
      const { data: configData, error: configError } = await supabase
        .from('integrations_config')
        .select('instance_id')
        .eq('integration_id', integrationId)
        .maybeSingle(); // Changed from .single()

      if (configError) {
        console.error(`[fetchAndUpdateDetails] Error checking config for ${integrationId}:`, configError);
      }

      let currentConfigData = configData; // Use a mutable variable

      // If no configData exists initially, attempt to create it and refetch
      if (!currentConfigData) {
        console.warn(`[fetchAndUpdateDetails] No config found for ${integrationId}. Attempting to create default.`);
        await updateIntegrationStatus(integrationId); // Ensure the row exists

        console.log(`[fetchAndUpdateDetails] Re-fetching config after creation attempt...`);
        const { data: refetchedConfigData, error: refetchError } = await supabase
          .from('integrations_config')
          .select('instance_id')
          .eq('integration_id', integrationId)
          .maybeSingle();

        if (refetchError) {
          console.error(`[fetchAndUpdateDetails] Error re-fetching config after creation for ${integrationId}:`, refetchError);
          return;
        }

        if (!refetchedConfigData) {
          console.error(`[fetchAndUpdateDetails] Config still not found after creation attempt for ${integrationId}. Cannot proceed.`);
          return;
        }
        console.log(`[fetchAndUpdateDetails] Successfully refetched config after creation.`);
        currentConfigData = refetchedConfigData;
      }

      if (!currentConfigData || !currentConfigData.instance_id) {
         console.warn(`[fetchAndUpdateDetails] Config exists for ${integrationId}, but instance_id is missing. Cannot match live instance.`);
         return;
      }

      const storedInstanceId = currentConfigData.instance_id;
      console.log(`[fetchAndUpdateDetails] Using stored instance_id: ${storedInstanceId}`);

      const liveInstances = await fetchEvolutionInstances(integrationId);
      console.log(`[fetchAndUpdateDetails] Fetched live instances from API:`, liveInstances);

      const matchedInstance = liveInstances.find(inst => inst.id === storedInstanceId);
      console.log(`[fetchAndUpdateDetails] Matched instance from array:`, matchedInstance);

      if (matchedInstance) {
        const instanceName = matchedInstance.name;
        const ownerJid = matchedInstance.ownerJid;
        console.log(`[fetchAndUpdateDetails] Found matching instance: Name=${instanceName}, OwnerJid=${ownerJid}`);

        const sanitizedUserReferenceId = ownerJid ? ownerJid.replace(/@s\.whatsapp\.net$/, '') : null;
        console.log(`[fetchAndUpdateDetails] Sanitized user_reference_id: ${sanitizedUserReferenceId}`);

        if (instanceName) {
          const { error: updateError } = await supabase
            .from('integrations_config')
            .update({
              instance_display_name: instanceName,
              owner_id: ownerJid,
              user_reference_id: sanitizedUserReferenceId
            })
            .eq('integration_id', integrationId);

          if (updateError) {
            console.error(`[fetchAndUpdateDetails] Error updating integrations_config for ${integrationId}:`, updateError);
          } else {
            console.log(`[fetchAndUpdateDetails] Successfully updated integrations_config for ${integrationId}.`);
          }
        } else {
            console.warn(`[fetchAndUpdateDetails] Matched instance ${matchedInstance.id} is missing a 'name'. Cannot update display name.`);
        }
      } else {
        console.warn(`[fetchAndUpdateDetails] Could not find live instance matching stored ID ${storedInstanceId}.`);
      }
    } catch (error) {
      console.error(`[fetchAndUpdateDetails] Error during fetch/update process for ${integrationId}:`, error);
    }
  }, [updateIntegrationStatus]); // Add updateIntegrationStatus dependency


  const refetchInstances = useCallback(async () => {
    if (!selectedIntegration?.id) {
      console.warn("[refetchInstances] No integration selected.");
      setFetchedInstances([]);
      return;
    }
    const integrationId = selectedIntegration.id; // Store ID for stable dependency
    setIsFetchingInstances(true);
    console.log("[refetchInstances] Manual fetch requested", { integrationId });
    try {
      const rawInstances = await fetchEvolutionInstances(integrationId);
      console.log("[refetchInstances] Manual fetch raw response", rawInstances);
       const validInstances = (rawInstances || []).filter(
         (inst): inst is EvolutionInstance =>
            !!inst &&
            typeof inst.id === 'string' &&
            typeof inst.name === 'string' &&
            typeof inst.connectionStatus === 'string' &&
            typeof inst.token === 'string'
       );
       console.log("[refetchInstances] Manual fetch valid instances after filtering", validInstances);
      setFetchedInstances(validInstances);

      // --- BEGIN: Insert fetched instances into integrations_config ---
      if (validInstances.length > 0) {
        console.log("[refetchInstances] Inserting fetched instances into DB...");
        console.log(`[DEBUG DUPLICATE CHECK][refetchInstances] Preparing to insert/update ${validInstances.length} instances. Current tenantId for these operations:`, tenantId);
        const insertPromises = validInstances.map(async (instance) => {
          const instanceId = instance.id;
          const instanceDisplayName = instance.name;
          const ownerId = instance.ownerJid; // May be undefined
          const userReferenceId = ownerId ? ownerId.replace(/@s\.whatsapp\.net$/, '') : null;

          try {
            const insertPayload = {
              integration_id: integrationId,
              instance_id: instanceId,
              instance_display_name: instanceDisplayName,
              owner_id: ownerId,
              user_reference_id: userReferenceId,
              pipeline_id: currentPipelineId || null,
              token: instance.token,
              tenant_id: tenantId,
            };
            console.log(`[DEBUG DUPLICATE CHECK][refetchInstances] Attempting to call upsert_integration_config RPC for instance_id: ${instanceId}, tenant_id: ${tenantId}.`);
            const rpcArgs = {
              p_integration_id: integrationId,
              p_instance_id: instanceId,
              p_tenant_id: tenantId,
              p_instance_display_name: instanceDisplayName,
              p_token: instance.token,
              p_owner_id: ownerId,
              p_user_reference_id: userReferenceId,
              p_pipeline_id: currentPipelineId || null,
              p_status: instance.connectionStatus // Pass connectionStatus as p_status
            };
            console.log('[DEBUG DUPLICATE CHECK][refetchInstances] RPC Args:', rpcArgs);
            const { error: rpcError } = await supabase.rpc('upsert_integration_config', rpcArgs);

            if (rpcError) {
              console.error(`[DEBUG DUPLICATE CHECK][refetchInstances] ERROR calling upsert_integration_config RPC for instance ${instanceId} (tenant: ${tenantId}):`, rpcError, 'Args were:', rpcArgs);
            } else {
               console.log(`[refetchInstances] Successfully called upsert_integration_config RPC for instance ${instanceId} (tenant: ${tenantId}).`);
            }
          } catch (err) {
            console.error(`[refetchInstances] Exception during insert for instance ${instanceId}:`, err);
          }
        });
        await Promise.all(insertPromises);
        console.log("[refetchInstances] Finished upserting instances via RPC.");

        // --- BEGIN: Delete stale instances from DB ---
        if (validInstances.length > 0) { // Only run deletion if we have a valid list of live instances
          const liveInstanceIds = validInstances.map(inst => inst.id);
          console.log(`[refetchInstances] Live instance IDs from API for integration ${integrationId} (tenant: ${tenantId}):`, liveInstanceIds);

          const { data: dbInstances, error: fetchDbError } = await supabase
            .from('integrations_config')
            .select('instance_id')
            .eq('integration_id', integrationId)
            .eq('tenant_id', tenantId); // Ensure we only check against the current tenant

          if (fetchDbError) {
            console.error(`[refetchInstances] Error fetching DB instance_ids for deletion check:`, fetchDbError);
          } else if (dbInstances) {
            const dbInstanceIds = dbInstances.map(dbInst => dbInst.instance_id).filter(id => id !== null) as string[];
            console.log(`[refetchInstances] DB instance IDs for integration ${integrationId} (tenant: ${tenantId}):`, dbInstanceIds);
            
            const staleInstanceIds = dbInstanceIds.filter(dbId => !liveInstanceIds.includes(dbId));

            if (staleInstanceIds.length > 0) {
              console.log(`[refetchInstances] Stale instance IDs to delete for integration ${integrationId} (tenant: ${tenantId}):`, staleInstanceIds);
              const { error: deleteError } = await supabase
                .from('integrations_config')
                .delete()
                .eq('integration_id', integrationId)
                .eq('tenant_id', tenantId)
                .in('instance_id', staleInstanceIds);

              if (deleteError) {
                console.error(`[refetchInstances] Error deleting stale instances for integration ${integrationId} (tenant: ${tenantId}):`, deleteError);
              } else {
                console.log(`[refetchInstances] Successfully deleted ${staleInstanceIds.length} stale instances for integration ${integrationId} (tenant: ${tenantId}).`);
              }
            } else {
              console.log(`[refetchInstances] No stale instances to delete for integration ${integrationId} (tenant: ${tenantId}).`);
            }
          }
        } else { // If validInstances is empty, it implies all existing instances for this integration_id/tenant_id might be stale
            console.log(`[refetchInstances] API returned no live instances for integration ${integrationId} (tenant: ${tenantId}). Deleting all associated DB instances.`);
            const { error: deleteAllError } = await supabase
                .from('integrations_config')
                .delete()
                .eq('integration_id', integrationId)
                .eq('tenant_id', tenantId); // Make sure to scope by tenant_id

            if (deleteAllError) {
                console.error(`[refetchInstances] Error deleting all instances for integration ${integrationId} (tenant: ${tenantId}) when API returned none:`, deleteAllError);
            } else {
                console.log(`[refetchInstances] Successfully deleted all instances for integration ${integrationId} (tenant: ${tenantId}) as API returned none.`);
            }
        }
        // --- END: Delete stale instances from DB ---
      }
      // --- END: Insert fetched instances ---

      if (validInstances.length > 0 && !validInstances.some(inst => inst.name === selectedInstanceName)) {
         setSelectedInstanceName(validInstances[0].name);
      } else if (validInstances.length === 0) {
         setSelectedInstanceName("");
      }
    } catch (err) {
      console.error("[refetchInstances] Manual fetch error", err);
      setFetchedInstances([]);
      setSelectedInstanceName("");
      toast({ variant: "destructive", title: "Error Fetching Instances", description: (err as Error).message });
    } finally {
      setIsFetchingInstances(false);
    }
  }, [selectedIntegration?.id, selectedInstanceName, tenantId, currentPipelineId, config]); // Dependency array is correct


  // --- Instance Fetching ---
  const fetchInstancesAndSetState = useCallback(async (integrationId: string) => {
    setIsFetchingInstances(true);
    console.log("[fetchInstancesAndSetState] Fetching instances for:", integrationId);
    try {
      const rawInstances = await fetchEvolutionInstances(integrationId);
      const validInstances = (rawInstances || []).filter(
        (inst): inst is EvolutionInstance =>
          !!inst &&
          typeof inst.id === 'string' &&
          typeof inst.name === 'string' &&
          typeof inst.connectionStatus === 'string' &&
          typeof inst.token === 'string'
      );
      setFetchedInstances(validInstances);

      // --- BEGIN: Insert fetched instances into integrations_config ---
      if (validInstances.length > 0) {
        console.log("[fetchInstancesAndSetState] Inserting fetched instances into DB...");
        console.log(`[DEBUG DUPLICATE CHECK][fetchInstancesAndSetState] Preparing to insert/update ${validInstances.length} instances. Current tenantId for these operations:`, tenantId);
        const insertPromises = validInstances.map(async (instance) => {
          const instanceId = instance.id;
          const instanceDisplayName = instance.name;
          const ownerId = instance.ownerJid; // May be undefined
          const userReferenceId = ownerId ? ownerId.replace(/@s\.whatsapp\.net$/, '') : null;

          try {
            const insertPayload = {
              integration_id: integrationId,
              instance_id: instanceId,
              instance_display_name: instanceDisplayName,
              owner_id: ownerId,
              user_reference_id: userReferenceId,
              pipeline_id: currentPipelineId || null,
              token: instance.token,
              tenant_id: tenantId,
            };
            console.log(`[DEBUG DUPLICATE CHECK][fetchInstancesAndSetState] Attempting to call upsert_integration_config RPC for instance_id: ${instanceId}, tenant_id: ${tenantId}.`);
            const rpcArgs = {
              p_integration_id: integrationId,
              p_instance_id: instanceId,
              p_tenant_id: tenantId,
              p_instance_display_name: instanceDisplayName,
              p_token: instance.token,
              p_owner_id: ownerId,
              p_user_reference_id: userReferenceId,
              p_pipeline_id: currentPipelineId || null,
              p_status: instance.connectionStatus // Pass connectionStatus as p_status
            };
            console.log('[DEBUG DUPLICATE CHECK][fetchInstancesAndSetState] RPC Args:', rpcArgs);
            const { error: rpcError } = await supabase.rpc('upsert_integration_config', rpcArgs);

            if (rpcError) {
              console.error(`[DEBUG DUPLICATE CHECK][fetchInstancesAndSetState] ERROR calling upsert_integration_config RPC for instance ${instanceId} (tenant: ${tenantId}):`, rpcError, 'Args were:', rpcArgs);
            } else {
               console.log(`[fetchInstancesAndSetState] Successfully called upsert_integration_config RPC for instance ${instanceId} (tenant: ${tenantId}).`);
            }
          } catch (err) {
            console.error(`[fetchInstancesAndSetState] Exception during insert for instance ${instanceId}:`, err);
          }
        });
        await Promise.all(insertPromises);
        console.log("[fetchInstancesAndSetState] Finished upserting instances via RPC.");

        // --- BEGIN: Delete stale instances from DB ---
        if (validInstances.length > 0) { // Only run deletion if we have a valid list of live instances
          const liveInstanceIds = validInstances.map(inst => inst.id);
          console.log(`[fetchInstancesAndSetState] Live instance IDs from API for integration ${integrationId} (tenant: ${tenantId}):`, liveInstanceIds);

          const { data: dbInstances, error: fetchDbError } = await supabase
            .from('integrations_config')
            .select('instance_id')
            .eq('integration_id', integrationId)
            .eq('tenant_id', tenantId); // Ensure we only check against the current tenant

          if (fetchDbError) {
            console.error(`[fetchInstancesAndSetState] Error fetching DB instance_ids for deletion check:`, fetchDbError);
          } else if (dbInstances) {
            const dbInstanceIds = dbInstances.map(dbInst => dbInst.instance_id).filter(id => id !== null) as string[];
            console.log(`[fetchInstancesAndSetState] DB instance IDs for integration ${integrationId} (tenant: ${tenantId}):`, dbInstanceIds);

            const staleInstanceIds = dbInstanceIds.filter(dbId => !liveInstanceIds.includes(dbId));

            if (staleInstanceIds.length > 0) {
              console.log(`[fetchInstancesAndSetState] Stale instance IDs to delete for integration ${integrationId} (tenant: ${tenantId}):`, staleInstanceIds);
              const { error: deleteError } = await supabase
                .from('integrations_config')
                .delete()
                .eq('integration_id', integrationId)
                .eq('tenant_id', tenantId)
                .in('instance_id', staleInstanceIds);

              if (deleteError) {
                console.error(`[fetchInstancesAndSetState] Error deleting stale instances for integration ${integrationId} (tenant: ${tenantId}):`, deleteError);
              } else {
                console.log(`[fetchInstancesAndSetState] Successfully deleted ${staleInstanceIds.length} stale instances for integration ${integrationId} (tenant: ${tenantId}).`);
              }
            } else {
              console.log(`[fetchInstancesAndSetState] No stale instances to delete for integration ${integrationId} (tenant: ${tenantId}).`);
            }
          }
        } else { // If validInstances is empty, it implies all existing instances for this integration_id/tenant_id might be stale
            console.log(`[fetchInstancesAndSetState] API returned no live instances for integration ${integrationId} (tenant: ${tenantId}). Deleting all associated DB instances.`);
            const { error: deleteAllError } = await supabase
                .from('integrations_config')
                .delete()
                .eq('integration_id', integrationId)
                .eq('tenant_id', tenantId); // Make sure to scope by tenant_id

            if (deleteAllError) {
                console.error(`[fetchInstancesAndSetState] Error deleting all instances for integration ${integrationId} (tenant: ${tenantId}) when API returned none:`, deleteAllError);
            } else {
                console.log(`[fetchInstancesAndSetState] Successfully deleted all instances for integration ${integrationId} (tenant: ${tenantId}) as API returned none.`);
            }
        }
        // --- END: Delete stale instances from DB ---
      }
      // --- END: Insert fetched instances ---

      if (validInstances.length > 0) {
        let currentSelectedInstanceName = selectedInstanceName;
        // If no instance is selected OR the selected one disappeared, select the first one
        if (!currentSelectedInstanceName || !validInstances.some(inst => inst.name === currentSelectedInstanceName)) {
           const firstInstanceName = validInstances[0].name;
           setSelectedInstanceName(firstInstanceName);
           currentSelectedInstanceName = firstInstanceName; // Update local variable for status check
           console.log(`[fetchInstancesAndSetState] Auto-selected instance: ${firstInstanceName}`);
        }

        // Find the status of the currently selected instance from the fetched list
        const currentSelectedInstance = validInstances.find(inst => inst.name === currentSelectedInstanceName);
        const fetchedStatus = currentSelectedInstance?.connectionStatus;

        console.log(`[fetchInstancesAndSetState] Fetched status is '${fetchedStatus}'. NOT setting localConnectionState based on initial fetch.`);


        // Update user_reference_id for the first instance (consider if this should be for the selected one)
        let ownerJid = validInstances[0].ownerJid; // Or should this be for the selected instance?
        if (ownerJid) {
          ownerJid = ownerJid.replace(/@s\.whatsapp\.net$/, '');
          // Update DB (consider moving this logic or making it more robust)
          supabase.from('integrations_config').update({ user_reference_id: ownerJid }).eq('integration_id', integrationId)
            .then(({ error }) => {
              if (error) console.error("[fetchInstancesAndSetState] Error updating user_reference_id:", error);
            });
        }

      } else {
        setSelectedInstanceName("");
        if (localConnectionState === 'qrcode') {
             console.log("[fetchInstancesAndSetState] No valid instances found, resetting 'qrcode' state to 'unknown'.");
             setLocalConnectionState('unknown');
        } else {
             console.log("[fetchInstancesAndSetState] No valid instances found, state remains:", localConnectionState);
        }
      }
    } catch (err) {
      console.error("[fetchInstancesAndSetState] Error:", err);
      toast({ variant: "destructive", title: "Error Fetching Instances", description: (err as Error).message });
      setFetchedInstances([]);
      setSelectedInstanceName("");
      setLocalConnectionState('unknown');
    } finally {
      setIsFetchingInstances(false);
    }
  }, [selectedInstanceName, localConnectionState, tenantId, currentPipelineId, config]); // Dependency array is correct


  // --- Effects ---

  // Effect to fetch integration limits
  useEffect(() => {
    const fetchIntegrationLimits = async () => {
      if (!open || !tenantId) {
        setCanAddMoreIntegrations(true); // Reset if not open or no tenantId
        setCurrentIntegrationCount(0);
        setMaxIntegrationsAllowed(null);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Get current integration count for the tenant
        const { count: integrationsCount, error: countError } = await supabase
          .from('integrations_config')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

        if (countError) throw countError;
        setCurrentIntegrationCount(integrationsCount ?? 0);

        // 2. Get allowed integrations from plan
        const { data: tenantDataUntyped, error: tenantError } = await supabase
          .from('tenants')
          .select('profile_id') // Fetch profile_id from tenants
          .eq('id', tenantId)
          .single();
        
        // Cast to unknown first, then to the expected shape, to bypass stricter type checking
        // This assumes 'profile_id' exists at runtime despite potential stale Supabase types.
        const tenantData = tenantDataUntyped as unknown as ({ profile_id: string | null } | null);

        if (tenantError || !tenantData || !tenantData.profile_id) {
          // If tenant not found or profile_id is null (either from DB or due to type issue)
          console.warn('Tenant not found, or profile_id is missing/null. Assuming no specific integration limit from plan.', { tenantError, tenantDataFromQuery: tenantDataUntyped });
          setMaxIntegrationsAllowed(null); 
          setCanAddMoreIntegrations(true);
        } else {
          // Now use tenantData.profile_id (which should be a string due to the !tenantData.profile_id check)
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('plan_id, plans ( integrations_allowed )')
            .eq('profile_id', tenantData.profile_id) // Link subscriptions via profile_id
            .eq('status', 'active') 
            .single();

          if (subscriptionError || !subscriptionData || !subscriptionData.plans) {
            console.warn('No active subscription with plan details found for this profile, or integrations_allowed not set on plan.', { subscriptionError, subscriptionData });
            setMaxIntegrationsAllowed(null); 
            setCanAddMoreIntegrations(true); 
          } else {
            setMaxIntegrationsAllowed(subscriptionData.plans.integrations_allowed);
            if (subscriptionData.plans.integrations_allowed !== null) {
              setCanAddMoreIntegrations((integrationsCount ?? 0) < subscriptionData.plans.integrations_allowed);
            } else {
              setCanAddMoreIntegrations(true); // null integrations_allowed means unlimited
            }
          }
        }
      } catch (error) {
        console.error("Error fetching integration limits:", error);
        toast({
          title: "Error",
          description: "Could not fetch integration limits.",
          variant: "destructive",
        });
        // Default to allowing addition on error to not block user, or set to false for stricter control
        setCanAddMoreIntegrations(true); 
        setMaxIntegrationsAllowed(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegrationLimits();
  }, [open, tenantId, selectedIntegration?.id]); // Re-run if dialog opens, tenant changes, or selectedIntegration changes (as it might trigger other logic)


  // Initial fetch on dialog open
  useEffect(() => {
    if (open && selectedIntegration?.id) {
      fetchInstancesAndSetState(selectedIntegration.id);
    } else if (!open) {
      // Reset state when dialog closes
      setFetchedInstances([]);
      setSelectedInstanceName("");
      setNewInstanceName("");
      setLocalConnectionState('unknown');
      setQrCodeBase64(null);
      setPairingCode(null);
      setIsPollingForConnection(false);
      if (qrPollingInterval) clearInterval(qrPollingInterval);
      setQrPollingInterval(null);
    }
  }, [open, selectedIntegration?.id, fetchInstancesAndSetState, qrPollingInterval]);


  // --- Polling Logic ---
  const pollConnectionStatus = useCallback(async () => {
    const instanceName = selectedInstanceName; // Use state variable
    const integrationId = selectedIntegration?.id;

    if (!instanceName || !integrationId) {
      console.warn("[pollConnectionStatus] Cannot poll without selected instance name or integration ID.");
      setIsPollingForConnection(false);
      return;
    }

    console.log(`[pollConnectionStatus] Polling status for: ${instanceName}`);
     try {
       const newStatus = await checkInstanceStatus(instanceName, integrationId);
       console.log("[pollConnectionStatus] Poll result:", newStatus);

       if (isValidConnectionState(newStatus)) {
         if (localConnectionState !== 'qrcode' || newStatus === 'open') {
           console.log(`[pollConnectionStatus] Updating state from ${localConnectionState} to ${newStatus}`);
           setLocalConnectionState(newStatus);
         } else {
           console.log(`[pollConnectionStatus] Current state is 'qrcode', new status is '${newStatus}'. Keeping 'qrcode' state.`);
         }
       } else {
         console.warn(`[pollConnectionStatus] Received invalid state '${newStatus}'. Setting to 'unknown'.`);
        setLocalConnectionState('unknown');
      }
    } catch (error) {
      console.error(`[pollConnectionStatus] Error polling instance ${instanceName}:`, error);
      setLocalConnectionState('unknown');
      setIsPollingForConnection(false);
    }
  }, [selectedInstanceName, selectedIntegration?.id, localConnectionState]);

  // Effect to START polling only when QR code is shown
  useEffect(() => {
    if (localConnectionState === 'qrcode') {
      console.log("[Polling Control Effect] State is qrcode, enabling polling.");
      setIsPollingForConnection(true);
    } else {
      if (isPollingForConnection) {
         console.log(`[Polling Control Effect] State changed from qrcode to ${localConnectionState}, disabling polling.`);
         setIsPollingForConnection(false);
      }
    }
  }, [localConnectionState, isPollingForConnection]);

  // Effect to run the polling interval
  useEffect(() => {
    if (qrPollingInterval) {
      clearInterval(qrPollingInterval);
     setQrPollingInterval(null);
   }

   let startTimeoutId: NodeJS.Timeout | null = null;

   if (isPollingForConnection && open) {
     console.log(`[Polling Interval Effect] Scheduling interval start after 5s delay.`);
     startTimeoutId = setTimeout(() => {
       console.log(`[Polling Interval Effect] Delay complete. Starting interval.`);
       const intervalId = setInterval(pollConnectionStatus, 5000);
       setQrPollingInterval(intervalId);
     }, 5000);

   } else {
      console.log(`[Polling Interval Effect] Not starting or stopping interval (isPolling: ${isPollingForConnection}, open: ${open}).`);
   }

   return () => {
     if (startTimeoutId) {
       console.log("[Polling Interval Cleanup] Clearing start timeout.");
       clearTimeout(startTimeoutId);
     }
     if (qrPollingInterval) {
       console.log("[Polling Interval Cleanup] Clearing interval.");
       clearInterval(qrPollingInterval);
       setQrPollingInterval(null);
     }
   };
 }, [open, isPollingForConnection, pollConnectionStatus]);


  // --- Effect for 'open' state ---
  useEffect(() => {
    if (localConnectionState === 'open') {
      console.log("[Open State Effect] State is 'open'.");
      setIsConnected(true);
      setIsPollingForConnection(false); 
      setQrCodeBase64(null);
      setPairingCode(null);
      if (onConnectionEstablished) {
        onConnectionEstablished();
      }
       if (selectedIntegration?.id) {
         const handleOpenState = async () => {
           const setupWebhook = async () => {
             try {
               const { data: integrationData, error: integrationError } = await supabase.from('integrations').select('webhook_url, webhook_events').eq('id', selectedIntegration.id).single();
             if (integrationError || !integrationData) throw new Error(`Failed to fetch integration details: ${integrationError?.message || 'No data'}`);
             const { data: configData, error: configError } = await supabase.from('integrations_config').select('instance_display_name').eq('integration_id', selectedIntegration.id).maybeSingle();
             if (configError) console.error(`Error fetching config for webhook: ${configError.message}`);
             const instanceDisplayName = configData?.instance_display_name || selectedInstanceName; 
             const webhookEventsValid = Array.isArray(integrationData.webhook_events) && integrationData.webhook_events.length > 0;
             if (!integrationData.webhook_url || !webhookEventsValid || !instanceDisplayName) {
               console.warn(`[Webhook Setup] Skipping: Missing URL, Events, or Display Name.`); return;
             }
             await setEvolutionWebhook(selectedIntegration.id, instanceDisplayName, integrationData.webhook_url, integrationData.webhook_events as string[]);
             toast({ title: "Webhook Configured", description: "Webhook settings applied." });
           } catch (error) { console.error("[Webhook Setup] Error:", error); toast({ title: "Webhook Setup Error", description: (error as Error).message, variant: "destructive" }); }
          };
           
           await Promise.all([
             setupWebhook(),
             fetchAndUpdateDetails(selectedIntegration.id) 
           ]);

          if (currentPipelineId) {
            console.log(`[Open State Effect] Updating pipeline_id to ${currentPipelineId} for integration ${selectedIntegration.id}`);
            const { error: pipelineUpdateError } = await supabase
              .from('integrations_config')
              .update({ pipeline_id: currentPipelineId })
              .eq('integration_id', selectedIntegration.id);
 
             if (pipelineUpdateError) {
               console.error(`[Open State Effect] Error updating pipeline_id:`, pipelineUpdateError);
               toast({
                title: "Error Saving Pipeline",
                description: `Failed to save selected pipeline: ${pipelineUpdateError.message}`,
                variant: "destructive",
              });
            } else {
              console.log(`[Open State Effect] Successfully updated pipeline_id for integration ${selectedIntegration.id}`);
             }
           } else {
              console.log(`[Open State Effect] No currentPipelineId set, skipping pipeline update for integration ${selectedIntegration.id}`);
           }
         }; 

         handleOpenState();
       }
     }
   }, [localConnectionState, selectedIntegration, onConnectionEstablished, selectedInstanceName, fetchAndUpdateDetails, currentPipelineId]);


  // --- Connection/Creation Handlers ---
  const handleConnect = useCallback(async (instanceNameToConnect: string | null | undefined = null, pipelineId?: string | undefined) => {
    const targetInstanceName = instanceNameToConnect || selectedInstanceName;
    console.log("[handleConnect] Function called for instance:", targetInstanceName, "Pipeline ID:", pipelineId);
    setCurrentPipelineId(pipelineId);

    if (!canAddMoreIntegrations && maxIntegrationsAllowed !== null) { // Check if explicitly cannot add more
        toast({
            title: "Integration Limit Reached",
            description: `You have reached the maximum of ${maxIntegrationsAllowed} integrations allowed for your current plan.`,
            variant: "destructive",
        });
        return;
    }

    if (!targetInstanceName) {
      toast({ title: "Error", description: "No instance name provided or selected.", variant: "destructive" });
      return;
    }
    if (!selectedIntegration?.id) {
      toast({ title: "Error", description: "Integration ID missing.", variant: "destructive" });
      return;
    }

    setSelectedInstanceName(targetInstanceName);
    setIsLoading(true);
    setLocalConnectionState('connecting');
    setQrCodeBase64(null);
    setPairingCode(null);

    try {
      const connectResponse = await evolutionConnectToInstance(targetInstanceName, selectedIntegration.id);
      console.log("[handleConnect] Raw connectResponse:", JSON.stringify(connectResponse, null, 2)); 

       if (!connectResponse.instance) {
         console.log("[handleConnect] connectResponse.instance is missing. Checking top-level base64/pairingCode.");
         let useBase64: string | null = null;
         let usePairingCode: string | null = null;
         const flatBase64 = connectResponse.base64;
         const flatPairing = connectResponse.pairingCode;
         if (flatBase64 && typeof flatBase64 === 'string' && flatBase64.startsWith('data:image')) useBase64 = flatBase64;
         if (!useBase64 && flatPairing && typeof flatPairing === 'string' && flatPairing.length > 0) usePairingCode = flatPairing;

         if (useBase64) {
           setQrCodeBase64(useBase64.startsWith('data:image/png;base64,') ? useBase64 : `data:image/png;base64,${useBase64}`);
           setPairingCode(null);
           setLocalConnectionState('qrcode');
           toast({ title: "Scan QR Code", description: "Scan the QR code with your WhatsApp." });
         } else if (usePairingCode) {
           setPairingCode(usePairingCode);
           setQrCodeBase64(null);
           setLocalConnectionState('qrcode');
           toast({ title: "Enter Pairing Code", description: "Enter the code shown on your WhatsApp." });
         } else {
           console.error("[handleConnect] No instance/QR/Pairing data in response.", connectResponse);
           toast({ variant: "destructive", title: "Connection Error", description: "Failed to retrieve connection details." });
           setLocalConnectionState('close');
         }
       } else {
         const instanceStatus = connectResponse.instance?.status as ConnectionState | undefined;

           let useBase64: string | null = null;
           let usePairingCode: string | null = null;
           const nestedBase64 = connectResponse.qrcode?.base64;
           const flatBase64 = connectResponse.base64;
           if (nestedBase64 && typeof nestedBase64 === 'string' && nestedBase64.startsWith('data:image')) useBase64 = nestedBase64;
           else if (flatBase64 && typeof flatBase64 === 'string' && flatBase64.startsWith('data:image')) useBase64 = flatBase64;
           if (!useBase64) {
             const nestedPairing = connectResponse.qrcode?.pairingCode;
             const flatPairing = connectResponse.pairingCode;
             if (nestedPairing && typeof nestedPairing === 'string' && nestedPairing.length > 0) usePairingCode = nestedPairing;
             else if (flatPairing && typeof flatPairing === 'string' && flatPairing.length > 0) usePairingCode = flatPairing;
           }

           if (useBase64) {
             setQrCodeBase64(useBase64.startsWith('data:image/png;base64,') ? useBase64 : `data:image/png;base64,${useBase64}`);
             setPairingCode(null);
             setLocalConnectionState('qrcode');
             toast({ title: "Scan QR Code", description: "Scan the QR code with your WhatsApp." });
           } else if (usePairingCode) {
             setPairingCode(usePairingCode);
             setQrCodeBase64(null);
             setLocalConnectionState('qrcode');
             toast({ title: "Enter Pairing Code", description: "Enter the code shown on your WhatsApp." });
           } else {
             console.error(`[handleConnect] Failed to get QR/Pairing data. Status: ${instanceStatus}. Response:`, connectResponse);
             toast({ variant: "destructive", title: "Connection Error", description: `Failed to retrieve QR/Pairing code. Status: ${instanceStatus || 'Unknown'}.` });
             setLocalConnectionState('close');
           }
       }
    } catch (error) {
      console.error("[handleConnect] Error during connection process:", error);
      toast({ variant: "destructive", title: "Connection Error", description: `An error occurred: ${(error as Error).message}` });
      setLocalConnectionState('close');
    } finally {
        setIsLoading(false);
    }
  }, [selectedIntegration?.id, selectedInstanceName]);


  const handleCreateAndConnect = useCallback(async (pipelineId?: string | undefined) => {
    if (!newInstanceName || !selectedIntegration?.id) return;

    if (!canAddMoreIntegrations && maxIntegrationsAllowed !== null) {
        toast({
            title: "Integration Limit Reached",
            description: `You cannot create a new instance as you've reached the maximum of ${maxIntegrationsAllowed} integrations allowed for your plan.`,
            variant: "destructive",
        });
        return;
    }

    console.log("[handleCreateAndConnect] Function called for new instance:", newInstanceName, "Pipeline ID:", pipelineId);
    setCurrentPipelineId(pipelineId);
    setIsLoading(true);
    const { success, error, instanceData } = await createEvolutionInstance(newInstanceName, selectedIntegration.id);
    if (success && instanceData) {
      await refetchInstances();
      setSelectedInstanceName(newInstanceName);
      // After creating, the connect logic will run, which also has the canAddMoreIntegrations check.
      // This is slightly redundant but ensures consistency if connect is called standalone.
      // If the creation itself counts as one integration, the check here is primary.
      await handleConnect(newInstanceName, pipelineId);
    } else {
      toast({ variant: "destructive", title: "Instance Creation Failed", description: error || "Failed to create instance." });
      setIsLoading(false);
    }
  }, [newInstanceName, selectedIntegration?.id, refetchInstances, handleConnect, canAddMoreIntegrations, maxIntegrationsAllowed]);


  // --- Other Handlers ---
  const handleSelectedInstanceNameChange = useCallback((name: string) => {
    setSelectedInstanceName(name);
    const instance = fetchedInstances.find(inst => inst.name === name);
    const status = instance?.connectionStatus;
    if (localConnectionState !== 'qrcode') {
        setLocalConnectionState(isValidConnectionState(status) ? status : 'unknown');
    }
    setQrCodeBase64(null); 
    setPairingCode(null); 
    setIsPollingForConnection(false); 
  }, [fetchedInstances, localConnectionState]); 

  const handleNewInstanceNameChange = useCallback((name: string) => {
    setNewInstanceName(name);
  }, []);

  const handleWebhookSetupComplete = useCallback(async () => {
    setShowWebhookSetup(false);
    setPendingWebhookIntegrationId(null);
    await handleConnect(newInstanceName);
  }, [handleConnect, newInstanceName]);


  // --- Return Values ---
  return {
    integrationMainPopup,
    setIntegrationMainPopup,
    showDeviceSelect,
    setShowDeviceSelect,
    isConnected,
    connectionState: localConnectionState,
    isLoading: isLoading || configLoading || isFetchingInstances,
    qrCodeBase64,
    pairingCode,
    handleConnect,
    fetchedInstances,
    isFetchingInstances,
    selectedInstanceName, 
    handleSelectedInstanceNameChange,
    newInstanceName,
    handleNewInstanceNameChange,
    handleCreateAndConnect,
    showWebhookSetup,
    pendingWebhookIntegrationId,
    handleWebhookSetupComplete,
    refetch: refetchInstances,
    // Expose new state for UI display
    currentIntegrationCount,
    maxIntegrationsAllowed,
    canAddMoreIntegrations,
  };
}
