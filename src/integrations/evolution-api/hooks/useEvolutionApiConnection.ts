import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEvolutionApiConfig } from "./useEvolutionApiConfig";
import { checkInstanceStatus } from "../services/instanceStatusService";
import { getEvolutionCredentials } from "../utils/credentials";
import { deleteEvolutionInstance } from "../services/deleteInstanceService";
import type { ConnectionState } from "../types";
import type { Integration } from "@/components/settings/types";

export function useEvolutionApiConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { config, isLoading: configLoading } = useEvolutionApiConfig(selectedIntegration);

  const checkCurrentConnectionState = useCallback(async () => {
    const instanceIdToCheck = config?.instance_id;
    const baseUrlToCheck = config?.base_url;
    const tokenToUse = config?.token;

    if (instanceIdToCheck && tokenToUse && baseUrlToCheck) {
      console.log(`Checking status for configured instance: ${instanceIdToCheck}`);
      try {
        const currentState = await checkInstanceStatus(instanceIdToCheck, tokenToUse, baseUrlToCheck);
        setConnectionState(currentState);
        return true;
      } catch (error) {
        console.error("Polling: Error checking instance status:", error);
        setConnectionState('close');
        return false;
      }
    } else {
      console.log('Status Check: Necessary details not available (Instance ID, Main API Key, or Base URL missing).');
    }
    return false;
  }, [config]);

  const startPolling = useCallback((newInstanceId: string, newToken: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    console.log(`Starting connection status polling for NEW instance: ${newInstanceId}`);
    const intervalId = setInterval(async () => {
      console.log(`Polling for NEW instance status: ${newInstanceId}`);
      const baseUrlToCheck = config?.base_url;

      if (!baseUrlToCheck) {
        console.error("Polling Error: Base URL not available from config.");
        clearInterval(intervalId);
        setPollingInterval(null);
        setConnectionState('close');
        return;
      }

      try {
        const currentState = await checkInstanceStatus(newInstanceId, newToken, baseUrlToCheck);
        setConnectionState(currentState);

        if (currentState === 'open') {
          console.log(`Polling successful: Instance ${newInstanceId} is open. Stopping polling.`);
          clearInterval(intervalId);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error(`Polling Error for instance ${newInstanceId}:`, error);
        clearInterval(intervalId);
        setPollingInterval(null);
        setConnectionState('close');
      }
    }, 3000);

    setPollingInterval(intervalId);
  }, [pollingInterval, config?.base_url, connectionState]);

  const connectToWhatsApp = async () => {
    setConnectionState('connecting');

    if (!selectedIntegration?.id) {
      toast({ title: "Error", description: "No integration selected.", variant: "destructive" });
      setConnectionState('close');
      return false;
    }
    if (!config?.base_url) {
      toast({ title: "Error", description: "Integration Base URL not found.", variant: "destructive" });
      setConnectionState('close');
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (config) {
      console.log('Initial connection state check with config:', config);
      checkCurrentConnectionState();
    }

    return () => {
      if (pollingInterval) {
        console.log('Cleaning up polling interval on unmount/config change.');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [config, checkCurrentConnectionState]);

  useEffect(() => {
    if ((connectionState === 'open' || connectionState === 'close') && pollingInterval) {
      console.log(`Connection state is ${connectionState}, stopping polling.`);
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [connectionState, pollingInterval]);

  return {
    connectToInstance: connectToWhatsApp,
    connectionState,
    isLoading: configLoading,
    checkCurrentConnectionState,
    qrCodeBase64,
    pairingCode
  };
}
