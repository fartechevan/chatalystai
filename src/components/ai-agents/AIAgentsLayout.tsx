import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import AgentListPanel from './AgentListPanel';
import AgentDetailsPanel from './AgentDetailsPanel';
import Breadcrumbs from '@/components/ui/Breadcrumbs'; // Import Breadcrumbs
import { getAIAgent } from '@/services/aiAgents/agentService'; // Import service to get agent details
import { AIAgent } from '@/types/aiAgents'; // Import agent type

type ViewState = 'list' | 'detail' | 'create';

const AIAgentsLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('list');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleNavigateToDetail = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('detail');
  };

  const handleNavigateToCreate = () => {
    setSelectedAgentId(null); // Ensure no agent is selected when creating
    setCurrentView('create');
  };

  const handleNavigateBackToList = () => {
    setSelectedAgentId(null);
    setCurrentView('list');
  };

  // Fetch selected agent details for breadcrumb name
  const { data: selectedAgentData } = useQuery<AIAgent | null, Error>({
    queryKey: ['aiAgent', selectedAgentId],
    queryFn: () => selectedAgentId ? getAIAgent(selectedAgentId) : null,
    enabled: !!selectedAgentId && currentView === 'detail', // Only fetch when viewing details
  });


  // --- Breadcrumb Logic ---
  const breadcrumbItems = React.useMemo(() => {
    // Explicitly type the base array item to match the BreadcrumbItem interface
    const base: { label: string; onClick?: () => void; isCurrent?: boolean }[] = [
      { label: 'AI Agents', onClick: handleNavigateBackToList, isCurrent: currentView === 'list' }
    ];
    if (currentView === 'create') {
      // No onClick needed for the current item
      base.push({ label: 'Create New Agent', isCurrent: true });
    } else if (currentView === 'detail' && selectedAgentId) {
      // No onClick needed for the current item
      base.push({ label: selectedAgentData?.name || 'Loading...', isCurrent: true });
    }
    return base;
  }, [currentView, selectedAgentId, selectedAgentData, handleNavigateBackToList]);


  return (
    <div className="h-full w-full flex flex-col p-4 space-y-4">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex-grow">
        {currentView === 'list' && (
          <AgentListPanel
            // Pass selectedAgentId for potential highlighting, though selection now triggers navigation
            selectedAgentId={selectedAgentId}
            onSelectAgent={handleNavigateToDetail} // Navigate to detail view on select
            onInitiateCreate={handleNavigateToCreate} // Add a prop to trigger create view
          />
        )}
        {(currentView === 'detail' || currentView === 'create') && (
          <AgentDetailsPanel
            selectedAgentId={selectedAgentId} // Will be null for 'create' view
            onAgentUpdate={handleNavigateBackToList} // Navigate back to list after successful action
            onNavigateBack={handleNavigateBackToList} // Add a prop for explicit back navigation
            key={selectedAgentId || 'create'} // Keep key to reset form state
          />
        )}
      </div>
    </div>
  );
};

export default AIAgentsLayout;
