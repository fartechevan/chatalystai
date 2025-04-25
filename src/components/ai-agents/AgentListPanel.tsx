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

// TODO: Define props if selection needs to be passed up/down
interface AgentListPanelProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  // Add onCreateNew callback later
}


const AgentListPanel: React.FC<AgentListPanelProps> = ({ selectedAgentId, onSelectAgent }) => {
  const { data: agents, isLoading, error, isError } = useQuery<AIAgent[], Error>({
    queryKey: ['aiAgents'], // Unique key for this query
    queryFn: listAIAgents, // Function to fetch data
  });

  const handleCreateNew = () => {
    // TODO: Implement logic to show the creation form in the details panel
    onSelectAgent(null); // Deselect any current agent to show create form
    console.log("Create New Agent clicked");
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-x-2">
        <CardTitle className="text-lg font-medium">AI Agents</CardTitle>
        <Button size="sm" onClick={handleCreateNew}>Create New</Button>
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
              <p className="text-center text-muted-foreground mt-4">No agents created yet.</p>
            ) : (
              <ul className="space-y-2">
                {agents.map((agent) => (
                  <li
                    key={agent.id}
                    className={cn(
                      "p-2 border rounded hover:bg-accent cursor-pointer",
                      selectedAgentId === agent.id && "bg-muted ring-2 ring-primary" // Highlight selected
                    )}
                    onClick={() => onSelectAgent(agent.id)}
                  >
                    {agent.name}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentListPanel;
