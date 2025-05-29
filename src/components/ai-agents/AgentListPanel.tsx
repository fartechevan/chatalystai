import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For error state
import { Terminal } from 'lucide-react'; // Icon for error alert
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Label } from '@/components/ui/label'; // Import Label for Switch accessibility
import { listAIAgents, updateAIAgent } from '@/services/aiAgents/agentService'; // Import updateAIAgent
import { AIAgent, UpdateAIAgent } from '@/types/aiAgents'; // Import UpdateAIAgent
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface AgentListPanelProps {
  selectedAgentId: string | null; // Keep for highlighting
  onSelectAgent: (agentId: string) => void; // Changed to only accept string ID
  onInitiateCreate: () => void; // New prop for triggering create view
}


const AgentListPanel: React.FC<AgentListPanelProps> = ({ selectedAgentId, onSelectAgent, onInitiateCreate }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: agents, isLoading, error, isError } = useQuery<AIAgent[], Error>({
    queryKey: ['aiAgents'], // Unique key for this query
    queryFn: listAIAgents, // Function to fetch data
  });

  // Mutation for updating agent status
  const updateMutation = useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: UpdateAIAgent }) => updateAIAgent(agentId, data),
    onSuccess: (updatedAgent) => {
      // Invalidate and refetch the agents list to show the updated status
      queryClient.invalidateQueries({ queryKey: ['aiAgents'] });
      // Optionally update the specific agent in the cache for immediate feedback
      queryClient.setQueryData(['aiAgent', updatedAgent.id], updatedAgent);
      toast({
        title: "Agent Updated",
        description: `Agent "${updatedAgent.name}" status changed.`,
      });
    },
    onError: (error: Error, variables) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: `Could not update agent status: ${error.message}`,
      });
       // Optional: Revert optimistic update if implemented
    },
  });


  const handleToggleEnabled = (agent: AIAgent, checked: boolean) => {
    updateMutation.mutate({ agentId: agent.id, data: { is_enabled: checked } });
  };


  const handleCreateNew = () => {
    // TODO: Implement logic to show the creation form in the details panel
    // onSelectAgent(null); // Deselect any current agent to show create form - Handled by onInitiateCreate now
    // Remove handleCreateNew function as it's now directly in onClick
    // onSelectAgent(null); // This logic is moved to the layout
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-x-2">
        <CardTitle className="text-lg font-medium">AI Agents</CardTitle>
        {/* Call onInitiateCreate directly */}
        <Button size="sm" onClick={onInitiateCreate}>Create New</Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto p-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && error && (
           <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error Fetching Agents</AlertTitle>
            <AlertDescription>
              {error.message || "An unknown error occurred."}
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !isError && agents && (
          <>
            {agents.length === 0 ? (
              <p className="text-center text-muted-foreground mt-4">No agents created yet. Click "Create New" to get started.</p>
            ) : (
              // Use a grid layout for cards - added xl:grid-cols-4 and 2xl:grid-cols-6
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
                {agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className={cn(
                      "hover:shadow-md hover:border-primary cursor-pointer transition-all aspect-square flex flex-col items-center justify-between p-2", // Changed p-4 to p-2
                      selectedAgentId === agent.id && "ring-2 ring-primary border-primary" // Highlight selected card
                    )}
                    // Wrap card content click, but allow switch interaction
                    onClick={(e) => {
                      // Prevent navigation if the click target is the switch or its label
                      if ((e.target as HTMLElement).closest('[data-agent-switch]')) {
                        return;
                      }
                      onSelectAgent(agent.id);
                    }}
                  >
                    {/* Agent Name */}
                    <CardTitle className="text-base text-center break-words mt-2">{agent.name}</CardTitle> {/* Added mt-2 */}

                    {/* Enable/Disable Switch */}
                    <div
                      className="flex items-center space-x-2 mt-auto mb-2" // Position at bottom
                      data-agent-switch // Add data attribute to identify switch area
                      onClick={(e) => e.stopPropagation()} // Stop propagation for the div as well
                    >
                      <Switch
                        id={`agent-enabled-${agent.id}`}
                        checked={agent.is_enabled ?? false} // Default to false if undefined
                        onCheckedChange={(checked) => handleToggleEnabled(agent, checked)}
                        disabled={updateMutation.isPending}
                        aria-label={`Enable/disable agent ${agent.name}`}
                      />
                      <Label htmlFor={`agent-enabled-${agent.id}`} className="text-xs text-muted-foreground">
                        {agent.is_enabled ?? false ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentListPanel;
