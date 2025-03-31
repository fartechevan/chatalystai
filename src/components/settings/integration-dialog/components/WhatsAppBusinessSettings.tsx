
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Integration } from "../../types";
import fetchInstances from "../hooks/whatsapp/services/fetchInstancesService";
import { useWhatsAppConfig } from "../hooks/whatsapp/useWhatsAppConfig";
import { WHATSAPP_INSTANCE } from "../hooks/whatsapp/services/config";
import { LoadingState } from "./whatsapp-business/LoadingState";
import { ErrorState } from "./whatsapp-business/ErrorState";
import { EmptyState } from "./whatsapp-business/EmptyState";
import { InstanceTable } from "./whatsapp-business/InstanceTable";
import { UsageWarning } from "./whatsapp-business/UsageWarning";

interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  onConnect: () => void;
}

export interface DisplayInstance {
  id: string;
  name: string;
  token: string;
  connectionStatus: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string;
}

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  const [instanceDetails, setInstanceDetails] = useState<DisplayInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutLoading, setIsLogoutLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { config } = useWhatsAppConfig(selectedIntegration);

  useEffect(() => {
    const fetchConfiguredInstance = async () => {
      if (!selectedIntegration?.id) {
        setIsLoading(false);
        setLoadError("No integration selected.");
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setInstanceDetails(null);

      try {
        console.log(`Fetching config for integration ${selectedIntegration.id}...`);
        const { data: configData, error: configError } = await supabase
          .from('integrations_config')
          .select('instance_id')
          .eq('integration_id', selectedIntegration.id)
          .maybeSingle();

        if (configError) {
          console.error(`Error fetching config for integration ${selectedIntegration.id}:`, configError);
          throw new Error(`Failed to fetch configuration: ${configError.message}`);
        }

        if (!configData?.instance_id) {
          console.log(`No instance_id configured for integration ${selectedIntegration.id}.`);
          setLoadError("WhatsApp integration is not configured yet.");
          setIsLoading(false);
          return;
        }

        const instanceId = configData.instance_id;
        console.log(`Found instance ID: ${instanceId}. Fetching details...`);

        const instanceNameFromConfig = configData.instance_id;
        console.log(`Found configured instance name: ${instanceNameFromConfig}. Fetching all instances to find details...`);

        const allInstancesResult = await fetchInstances();

        if (!Array.isArray(allInstancesResult)) {
          const errorResult = allInstancesResult as { error: string };
          console.error('Error fetching instances list:', errorResult.error);
          throw new Error(errorResult.error || 'Failed to fetch instances list.');
        }
        
        console.log("Successfully fetched instances array:", allInstancesResult);
        const receivedIds = (allInstancesResult as DisplayInstance[]).map(item => item.id);
        console.log(`[DEBUG] IDs received from fetchInstances API:`, receivedIds);
        console.log(`[DEBUG] Searching for ID from Supabase config: ${instanceNameFromConfig}`);

        const matchingInstance = (allInstancesResult as DisplayInstance[]).find(
          item => item.id === instanceNameFromConfig
        );

        if (!matchingInstance) {
          console.error(`Configured instance with ID '${instanceNameFromConfig}' not found in the fetched list.`);
          throw new Error(`Configured instance with ID '${instanceNameFromConfig}' not found.`);
        }

        console.log("Found matching configured instance data:", matchingInstance);
        setInstanceDetails(matchingInstance);
        console.log(`[DEBUG] Attempting to save to localStorage with key ${WHATSAPP_INSTANCE}:`, matchingInstance);
        try {
          localStorage.setItem(WHATSAPP_INSTANCE, JSON.stringify(matchingInstance));
          console.log(`[DEBUG] Successfully saved full instance data to localStorage using key ${WHATSAPP_INSTANCE}.`);
          const retrievedData = localStorage.getItem(WHATSAPP_INSTANCE);
          console.log(`[DEBUG] Verification retrieve from localStorage:`, retrievedData ? JSON.parse(retrievedData) : 'null or empty');
        } catch (storageError) {
          console.error(`[DEBUG] Error saving to localStorage:`, storageError);
        }
      } catch (error) {
        console.error('Error fetching configured instance:', error);
        const errorMessage = (error as Error).message || "An unexpected error occurred";
        setLoadError(`Could not load WhatsApp instance details: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguredInstance();
  }, [selectedIntegration]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (loadError && !instanceDetails) {
    return <ErrorState errorMessage={loadError} />;
  }

  if (!isLoading && !instanceDetails && !loadError) {
    return <EmptyState />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Configured Instance</h3>
          <div className="mt-8">
            {instanceDetails && (
              <InstanceTable
                instanceDetails={instanceDetails}
                onConnect={onConnect}
                isLogoutLoading={isLogoutLoading}
                setIsLogoutLoading={setIsLogoutLoading}
              />
            )}
          </div>
        </div>
        
        <UsageWarning />
      </div>
    </ScrollArea>
  );
}
