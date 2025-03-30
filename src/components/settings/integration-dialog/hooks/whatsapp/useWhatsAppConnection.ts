
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useWhatsAppConfig } from "./useWhatsAppConfig";
import { checkConnectionState } from "./services/connectionStateService";
import { checkInstanceStatus } from "./services/instanceStatusService";
import { initializeConnection } from "./services/connectionInitService";
import type { ConnectionState } from "./types";
import type { Integration } from "../../../types";

export function useWhatsAppConnection(selectedIntegration: Integration | null) {
  const { toast } = useToast();
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { config, isLoading: configLoading } = useWhatsAppConfig(selectedIntegration);

  // Function to check the current connection state explicitly
  const checkCurrentConnectionState = useCallback(async () => {
    if (config) {
      console.log('Checking current connection state with config:', config);
      return await checkInstanceStatus(
        config, 
        (state: ConnectionState) => setConnectionState(state), 
        setQrCodeBase64
      );
    }
    return false;
  }, [config]);

  const startPolling = () => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start a new polling interval
    const intervalId = setInterval(async () => {
      await checkConnectionState(
        config, 
        (state: ConnectionState) => setConnectionState(state), 
        toast
      );
      // Re-check instance status to get the accurate state
      await checkCurrentConnectionState();
    }, 5000); // Check every 5 seconds

    setPollingInterval(intervalId);

    // Cleanup interval after 2 minutes if not connected
    setTimeout(() => {
      if (intervalId && pollingInterval === intervalId) {
        clearInterval(intervalId);
        setPollingInterval(null);
      }
    }, 120000);
  };

  const connectToWhatsApp = async () => {
    if (!config) {
      toast({
        title: "Configuration Error",
        description: "Integration configuration not found",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('Attempting to connect with instanceId:', config.instance_id, 'and baseUrl:', config.base_url);
      
      // Save instance info to localStorage for direct API access when needed
      if (selectedIntegration) {
        // Try to fetch instances first to get token information
        try {
          console.log('Fetching instances to get token information');
          const response = await fetch(`${config.base_url || 'https://api.evoapicloud.com'}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'apikey': '64D1C2D8D89F-4916-A1DD-B1F666B79341', // Use the provided API key
            },
          });
          
          if (response.ok) {
            const instances = await response.json();
            console.log('Fetched instances:', instances);
            
            // Find our instance
            const instance = Array.isArray(instances) ? 
              instances.find(inst => inst.id === config.instance_id) : null;
              
            if (instance) {
              console.log('Found our instance in the list:', instance.id);
              localStorage.setItem('whatsapp_instance', JSON.stringify(instance));
            }
          }
        } catch (fetchError) {
          console.error('Error fetching instances:', fetchError);
        }
      }
      
      // Check connection state before continuing
      console.log('Checking connection state using the curl method');
      const isAlreadyConnected = await checkCurrentConnectionState();
      
      if (isAlreadyConnected) {
        console.log('Instance is already connected');
        setConnectionState('open');
        toast({
          title: "Already Connected",
          description: "WhatsApp is already connected",
        });
        return true;
      }
      
      // Continue with connection initialization
      const result = await initializeConnection(config, toast);
      
      if (result.success) {
        if (result.qrCodeDataUrl) {
          console.log('QR code generated successfully:', result.qrCodeDataUrl);
          setQrCodeBase64(result.qrCodeDataUrl);
        }
        
        if (result.pairingCode) {
          console.log('Pairing code generated:', result.pairingCode);
          setPairingCode(result.pairingCode);
        }
        
        setConnectionState('connecting');
        
        // Start polling for connection status
        startPolling();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to initialize WhatsApp connection",
        variant: "destructive",
      });
      console.error('WhatsApp connection error:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check initial connection state when the component mounts or config changes
    if (config) {
      console.log('Initial connection state check with config:', config);
      checkInstanceStatus(
        config, 
        (state: ConnectionState) => setConnectionState(state), 
        setQrCodeBase64
      );
    }

    return () => {
      // Cleanup polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setQrCodeBase64(null);
      setPairingCode(null);
      setConnectionState('unknown');
    };
  }, [config]);

  return { 
    initializeConnection: connectToWhatsApp, 
    qrCodeBase64, 
    pairingCode,
    connectionState,
    isLoading: configLoading,
    checkCurrentConnectionState
  };
}
