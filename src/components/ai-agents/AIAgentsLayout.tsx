import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { Bot, MessageSquareText } from 'lucide-react'; // Import icons
import AgentListPanel from './AgentListPanel';
import AgentDetailsPanel from './AgentDetailsPanel';
import AgentConversationLogs from './AgentConversationLogs';
import SessionListPanel from './SessionListPanel'; // Import the SessionListPanel
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { getAIAgent } from '@/services/aiAgents/agentService';
import { AIAgent } from '@/types/aiAgents';
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { Button } from '@/components/ui/button'; // Import Button for sidebar

// Add 'logs' to the view state
type ViewState = 'list' | 'detail' | 'create' | 'logs';

const AIAgentsLayout: React.FC = () => {
  // Default to 'list' view, which now represents the "Agents" section
  const [currentView, setCurrentView] = useState<ViewState>('list');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null); // Add state for selected session
  // State to track the sub-view within the "Agents" section
  const [agentSubView, setAgentSubView] = useState<'list' | 'detail' | 'create'>('list');

  const handleNavigateToDetail = (agentId: string) => {
    setSelectedAgentId(agentId);
    setAgentSubView('detail'); // Set the sub-view
    setCurrentView('detail'); // Keep top-level view consistent for breadcrumbs etc. if needed
  };

  const handleNavigateToCreate = () => {
    setSelectedAgentId(null);
    setAgentSubView('create'); // Set the sub-view
    setCurrentView('create'); // Keep top-level view consistent
  };

  // Navigate back within the "Agents" section
  const handleNavigateBackToAgentList = () => {
    setSelectedAgentId(null);
    setAgentSubView('list');
    setCurrentView('list'); // Reset top-level view to list
  };

  // Navigate to the "Conversation Logs" section
  const handleNavigateToLogs = () => {
    setSelectedAgentId(null); // Clear agent selection
    setSelectedSessionId(null); // Clear session selection when navigating to logs view
    setAgentSubView('list'); // Reset agent sub-view
    setCurrentView('logs'); // Set top-level view to logs
  };

  // Navigate to the "Agents" section (list view)
  const handleNavigateToAgents = () => {
     handleNavigateBackToAgentList(); // Reuse existing logic to go to agent list
  };


  // Fetch selected agent details for breadcrumb name (only when in detail view)
  const { data: selectedAgentData } = useQuery<AIAgent | null, Error>({
    queryKey: ['aiAgent', selectedAgentId],
    queryFn: () => selectedAgentId ? getAIAgent(selectedAgentId) : null,
    enabled: !!selectedAgentId && agentSubView === 'detail', // Fetch only when showing agent details
  });


  // --- Breadcrumb Logic ---
  const breadcrumbItems = React.useMemo(() => {
    const base: { label: string; onClick?: () => void; isCurrent?: boolean }[] = [
      // Base breadcrumb for the AI Agents section
      {
        label: 'AI Agents',
        onClick: currentView !== 'list' ? handleNavigateToAgents : undefined, // Clickable only if not already in list view
        isCurrent: currentView !== 'logs' && agentSubView === 'list'
      }
    ];

    if (currentView === 'logs') {
       // Add breadcrumb for Conversation Logs view
       base.push({ label: 'Conversation Logs', isCurrent: true });
    } else if (agentSubView === 'create') {
       // Add breadcrumb for Create Agent view
       base.push({ label: 'Create New Agent', isCurrent: true });
    } else if (agentSubView === 'detail' && selectedAgentId) {
       // Add breadcrumb for Agent Detail view
       base.push({ label: selectedAgentData?.name || 'Loading...', isCurrent: true });
    }
    return base;
  }, [currentView, agentSubView, selectedAgentId, selectedAgentData, handleNavigateToAgents]);


  return (
    <div className="h-full w-full flex p-0"> {/* Remove padding from outer div */}
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/40 p-4 flex flex-col space-y-2">
         <h2 className="text-lg font-semibold mb-4">AI Agents</h2>
         <Button
           variant={currentView !== 'logs' ? 'secondary' : 'ghost'}
           className="w-full justify-start"
           onClick={handleNavigateToAgents}
         >
           <Bot className="mr-2 h-4 w-4" />
           Agents
         </Button>
         <Button
           variant={currentView === 'logs' ? 'secondary' : 'ghost'}
           className="w-full justify-start"
           onClick={handleNavigateToLogs}
         >
           <MessageSquareText className="mr-2 h-4 w-4" />
           Conversation Logs
         </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col p-4 space-y-4">
         <Breadcrumbs items={breadcrumbItems} />
          {/* Use grid layout for logs view, otherwise flex for other views */}
          <div className={cn(
            "flex-grow",
            currentView === 'logs' ? "grid grid-cols-1 lg:grid-cols-3 gap-4" : "flex"
          )}>
            {currentView === 'logs' ? (
              <>
                {/* Session List Panel (takes 1/3 width on large screens) */}
                <div className="lg:col-span-1 h-full">
                  <SessionListPanel
                    selectedSessionId={selectedSessionId}
                    onSelectSession={setSelectedSessionId} // Update state on selection
                  />
                </div>
                {/* Conversation Logs Panel (takes 2/3 width on large screens) */}
                <div className="lg:col-span-2 h-full">
                  <AgentConversationLogs sessionId={selectedSessionId} />
                </div>
              </>
            ) : agentSubView === 'list' ? (
              // Agent List takes full width when active
              <div className="w-full h-full">
                <AgentListPanel
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={handleNavigateToDetail}
                  onInitiateCreate={handleNavigateToCreate}
                />
              </div>
            ) : ( // 'detail' or 'create' sub-views take full width
              <div className="w-full h-full">
                <AgentDetailsPanel
                  selectedAgentId={selectedAgentId}
                  onAgentUpdate={handleNavigateBackToAgentList} // Navigate back within agents section
                  onNavigateBack={handleNavigateBackToAgentList} // Navigate back within agents section
                  key={selectedAgentId || 'create'}
                />
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default AIAgentsLayout;
