
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Facebook, Instagram, Mail, Phone, CheckCircle, XCircle, Settings } from "lucide-react"; // Added icons
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { useNavigate } from 'react-router-dom'; // For navigation

// Define type for integration with connection status
type IntegrationChannel = Database['public']['Tables']['integrations']['Row'] & {
  connected: boolean;
};

// Map integration types to icons (adjust as needed)
const channelIcons: { [key: string]: React.ElementType } = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  facebook: Facebook,
  email: Mail,
  phone: Phone,
  default: Settings, // Default icon
};

export function ChannelSection() {
  const [channels, setChannels] = useState<IntegrationChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const navigate = useNavigate();

  // Fetch integrations and their config status
  useEffect(() => {
    const fetchChannels = async () => {
      setIsLoadingChannels(true);
      try {
        // Fetch all integrations
        const { data: integrations, error: integrationsError } = await supabase
          .from('integrations')
          .select('*'); // Select necessary fields

        if (integrationsError) throw integrationsError;
        if (!integrations) {
          setChannels([]);
          return;
        }

        // Fetch all integration_ids from config table
        const { data: configs, error: configsError } = await supabase
          .from('integrations_config')
          .select('integration_id'); // Only need integration_id

        if (configsError) throw configsError;

        const connectedIntegrationIds = new Set(configs?.map(c => c.integration_id) || []);

        // Combine data and determine connection status
        const integrationChannels: IntegrationChannel[] = integrations.map(integration => ({
          ...integration,
          connected: connectedIntegrationIds.has(integration.id),
        }));

        setChannels(integrationChannels);

      } catch (error) {
        console.error("Error fetching integration channels:", error);
        toast({
          title: "Error",
          description: "Could not load channels.",
          variant: "destructive",
        });
        setChannels([]); // Clear channels on error
      } finally {
        setIsLoadingChannels(false);
      }
    };

    fetchChannels();
  }, []); // Run only on mount

  const handleConfigureClick = (integrationId: string) => {
    // Navigate to the settings page, potentially passing the integration ID
    // Adjust the path as needed based on your routing setup
    navigate(`/dashboard/settings?integration=${integrationId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        {/* Optional: Add a button to navigate to settings/integrations */}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate('/dashboard/settings')}>
          Manage Integrations
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingChannels ? (
          // Loading Skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : channels.length === 0 ? (
           <p className="text-sm text-muted-foreground text-center py-4">No channels configured yet. Go to Settings to add integrations.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              // Use channel.name (lowercase) to find the icon key
              const iconKey = channel.name?.toLowerCase().includes('whatsapp') ? 'whatsapp' 
                            : channel.name?.toLowerCase().includes('instagram') ? 'instagram'
                            : channel.name?.toLowerCase().includes('facebook') ? 'facebook'
                            : channel.name?.toLowerCase().includes('email') ? 'email'
                            : channel.name?.toLowerCase().includes('phone') ? 'phone' 
                            : 'default';
              const IconComponent = channelIcons[iconKey] || Settings;
              return (
                <div key={channel.id} className="p-4 rounded-lg border bg-card flex flex-col justify-between">
                  <div> {/* Content wrapper */}
                    <div className="flex items-start gap-4 mb-4">
                      <IconComponent className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{channel.name || 'Unnamed Channel'}</h3>
                        {/* Display connection status text */}
                        <p className={cn(
                          "text-xs font-medium flex items-center gap-1",
                          channel.connected ? "text-green-600" : "text-amber-600"
                        )}>
                          {channel.connected ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {channel.connected ? 'Connected' : 'Not Connected'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={channel.connected ? "outline" : "secondary"}
                    className="w-full mt-2" // Ensure button is at the bottom
                    onClick={() => handleConfigureClick(channel.id)}
                  >
                    {channel.connected ? 'Manage' : 'Configure'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
