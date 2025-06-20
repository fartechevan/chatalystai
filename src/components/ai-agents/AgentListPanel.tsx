import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { listAIAgents, updateAIAgent } from '@/services/aiAgents/agentService';
import { listIntegrations } from '@/services/integrations/integrationService';
import { AIAgent, UpdateAIAgent } from '@/types/aiAgents';
import { ConfiguredIntegration } from '@/services/integrations/integrationService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import DataListView from '@/components/shared/DataListView'; // Import the reusable component
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Info } from 'lucide-react';


interface AgentListPanelProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onInitiateCreate: () => void; 
}

const AgentListPanel: React.FC<AgentListPanelProps> = ({ selectedAgentId, onSelectAgent, onInitiateCreate }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery<ConfiguredIntegration[], Error>({
    queryKey: ['configuredIntegrations'],
    queryFn: listIntegrations,
  });

  // Mutation for updating agent status (remains here as it's tied to item rendering)
  const updateMutation = useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: UpdateAIAgent }) => updateAIAgent(agentId, data),
    onSuccess: (updatedAgent) => {
      queryClient.invalidateQueries({ queryKey: ['aiAgents'] });
      queryClient.setQueryData(['aiAgent', updatedAgent.id], updatedAgent);
      toast({
        title: "Agent Updated",
        description: `Agent "${updatedAgent.name}" status changed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: `Could not update agent status: ${error.message}`,
      });
    },
  });

  const handleToggleEnabled = (agent: AIAgent, checked: boolean) => {
    updateMutation.mutate({ agentId: agent.id, data: { is_enabled: checked } });
  };

  const renderAgentItem = (agent: AIAgent) => (
    <Card
      key={agent.id}
      className={cn(
        "hover:shadow-md hover:border-primary cursor-pointer transition-all aspect-square flex flex-col items-center justify-between p-2",
        selectedAgentId === agent.id && "ring-2 ring-primary border-primary"
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-agent-switch]')) {
          return;
        }
        onSelectAgent(agent.id);
      }}
    >
      <CardTitle className="text-base text-center break-words mt-2">{agent.name}</CardTitle>
      
      {agent.integration_ids && agent.integration_ids.length > 0 && integrations && !isLoadingIntegrations && (
        <div className="mt-1 flex flex-wrap justify-center gap-1 px-1 max-h-16 overflow-y-auto"> {/* Added max-h and overflow */}
          {agent.integration_ids.flatMap(agentIntegrationId => {
            const matchingConfiguredIntegrations = integrations.filter(
              cfgInteg => cfgInteg.base_integration_id === agentIntegrationId
            );
            if (matchingConfiguredIntegrations.length === 0) {
              // Optionally, find the base integration name if no configured instances are found but ID exists
              // This case might indicate an agent linked to a base integration type that has no configured instances yet.
              // For now, we'll only show configured ones.
              return []; // Return empty array if no configured instances match this base_integration_id
            }
            return matchingConfiguredIntegrations.map(cfgInteg => (
              <Badge key={cfgInteg.id} variant="secondary" className="text-xs">
                {cfgInteg.instance_display_name || cfgInteg.name}
              </Badge>
            ));
          })}
        </div>
      )}
      
      <div
        className="flex items-center space-x-2 mt-auto mb-2"
        data-agent-switch
        onClick={(e) => e.stopPropagation()}
      >
        <Switch
          id={`agent-enabled-${agent.id}`}
          checked={agent.is_enabled ?? false}
          onCheckedChange={(checked) => handleToggleEnabled(agent, checked)}
          disabled={updateMutation.isPending}
          aria-label={`Enable/disable agent ${agent.name}`}
        />
        <Label htmlFor={`agent-enabled-${agent.id}`} className="text-xs text-muted-foreground">
          {agent.is_enabled ?? false ? 'Enabled' : 'Disabled'}
        </Label>
      </div>
    </Card>
  );
  
  const renderCustomLoading = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 p-4">
      {Array.from({ length: 6 }).map((_, index) => ( // Show 6 skeletons for grid
        <Skeleton key={index} className="aspect-square w-full" />
      ))}
    </div>
  );

  const renderCustomEmpty = () => (
     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
        <Info className="h-12 w-12 mb-4" />
        <p className="text-lg font-semibold">No Agents Found</p>
        <p className="text-sm">No agents have been created yet. Click "Create New Agent" in the header to get started.</p>
      </div>
  );


  return (
    <div className="w-full h-full flex flex-col">
      <CardContent className="flex-grow overflow-auto p-4">
        <DataListView<AIAgent, Error>
          queryKey={['aiAgents']}
          queryFn={listAIAgents}
          renderItem={renderAgentItem}
          layout="grid"
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4"
          className="h-full" // Ensure DataListView takes full height of CardContent
          renderLoading={renderCustomLoading}
          renderEmpty={renderCustomEmpty}
          // renderError can use the default from DataListView or be customized here
        />
      </CardContent>
    </div>
  );
};

export default AgentListPanel;
