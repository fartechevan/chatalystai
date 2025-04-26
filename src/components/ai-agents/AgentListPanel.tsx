import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For error state
import { Terminal } from 'lucide-react'; // Icon for error alert
import { listAIAgents } from '@/services/aiAgents/agentService';
import { AIAgent } from '@/types/aiAgents';
import { cn } from '@/lib/utils';
import { CardDescription } from '@/components/ui/card'; // Import CardDescription

interface AgentListPanelProps {
  selectedAgentId: string | null; // Keep for highlighting
  onSelectAgent: (agentId: string) => void; // Changed to only accept string ID
  onInitiateCreate: () => void; // New prop for triggering create view
}


const AgentListPanel: React.FC<AgentListPanelProps> = ({ selectedAgentId, onSelectAgent, onInitiateCreate }) => {
  const { data: agents, isLoading, error, isError } = useQuery<AIAgent[], Error>({
    queryKey: ['aiAgents'], // Unique key for this query
    queryFn: listAIAgents, // Function to fetch data
  });

  const handleCreateNew = () => {
    // TODO: Implement logic to show the creation form in the details panel
    onSelectAgent(null); // Deselect any current agent to show create form
    console.log("Create New Agent clicked");
    // Remove handleCreateNew function as it's now directly in onClick
    // onSelectAgent(null); // This logic is moved to the layout
    console.log("Create New Agent clicked");
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
              // Use a grid layout for cards
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className={cn(
                      "hover:shadow-md hover:border-primary cursor-pointer transition-all",
                      selectedAgentId === agent.id && "ring-2 ring-primary border-primary" // Highlight selected card
                    )}
                    onClick={() => onSelectAgent(agent.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                      {/* Optional: Add description, e.g., prompt snippet or doc count */}
                      {/* <CardDescription className="text-xs truncate h-8">
                        {agent.prompt ? `${agent.prompt.substring(0, 50)}...` : 'No prompt defined'}
                      </CardDescription> */}
                    </CardHeader>
                    {/* Optional: Add CardContent for more details if needed */}
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
