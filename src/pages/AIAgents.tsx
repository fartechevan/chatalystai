import React, { useState, useEffect, useCallback } from 'react';
import AIAgentsLayout from '@/components/ai-agents/AIAgentsLayout';
import { usePageActionContext } from '@/context/PageActionContext';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquareText, PlusCircle } from 'lucide-react'; // Added PlusCircle
import type { ViewState as AIAgentsViewState } from '@/components/ai-agents/AIAgentsLayout'; // Import ViewState type

const AIAgentsPage = () => {
  const { setHeaderNavNode, setSecondaryActionNode } = usePageActionContext();

  // State lifted from AIAgentsLayout
  const [currentView, setCurrentView] = useState<AIAgentsViewState>('list');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [agentSubView, setAgentSubView] = useState<'list' | 'detail' | 'create'>('list');


  // Navigation handlers lifted from AIAgentsLayout
  const handleNavigateToDetail = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setAgentSubView('detail');
    setCurrentView('detail');
  }, [setSelectedAgentId, setAgentSubView, setCurrentView]);

  const handleNavigateToCreate = useCallback(() => {
    setSelectedAgentId(null);
    setAgentSubView('create');
    setCurrentView('create');
  }, [setSelectedAgentId, setAgentSubView, setCurrentView]);

  const handleNavigateBackToAgentList = useCallback(() => {
    setSelectedAgentId(null);
    setAgentSubView('list');
    setCurrentView('list');
  }, [setSelectedAgentId, setAgentSubView, setCurrentView]);

  const handleNavigateToLogs = useCallback(() => {
    // Assumes selectedAgentId is already set because the button is only visible then
    setSelectedSessionId(null); // Reset to show list of sessions for the agent
    setCurrentView('logs');
  }, [setSelectedSessionId, setCurrentView]);

  const handleNavigateToAgents = useCallback(() => {
    // Assumes selectedAgentId is already set
    if (selectedAgentId) {
      setCurrentView('detail');
      setAgentSubView('detail'); // Ensure we are on the detail sub-view for the selected agent
    } else {
      // Fallback, though tabs shouldn't be visible if no agent is selected
      handleNavigateBackToAgentList();
    }
  }, [selectedAgentId, setCurrentView, setAgentSubView, handleNavigateBackToAgentList]);

  useEffect(() => {
    let mainNavButtons = null;
    if (selectedAgentId) { // Only create these buttons if an agent is selected
      mainNavButtons = (
        <div
          role="tablist"
          aria-orientation="vertical"
          data-slot="tabs-list"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
          tabIndex={0}
          data-orientation="vertical"
          style={{ outline: 'none' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'detail'}
            aria-controls="radix-ri8-content-agents"
            data-state={currentView === 'detail' ? 'active' : 'inactive'}
            id="radix-ri8-trigger-agents"
            data-slot="tabs-trigger"
            className={`data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`}
            tabIndex={currentView === 'detail' ? 0 : -1}
            data-orientation="vertical"
            data-radix-collection-item=""
            onClick={handleNavigateToAgents}
          >
            Agents
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'logs'}
            aria-controls="radix-ri8-content-logs"
            data-state={currentView === 'logs' ? 'active' : 'inactive'}
            id="radix-ri8-trigger-logs"
            data-slot="tabs-trigger"
            className={`data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`}
            tabIndex={currentView === 'logs' ? 0 : -1}
            data-orientation="vertical"
            data-radix-collection-item=""
            onClick={handleNavigateToLogs}
          >
            Conversation Logs
          </button>
        </div>
      );
    }
    setHeaderNavNode(mainNavButtons);

    const createAgentButton = (
      <Button
        variant={agentSubView === 'create' ? 'default' : 'outline'}
        onClick={handleNavigateToCreate}
        size="sm"
        // className="ml-auto" // No longer needed here as it's in the secondary action slot
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Agent
      </Button>
    );
    setSecondaryActionNode(createAgentButton);

    // Clear the header nav and secondary action when the component unmounts
    return () => {
      setHeaderNavNode(null);
      setSecondaryActionNode(null);
    };
  }, [
    setHeaderNavNode, 
    setSecondaryActionNode,
    currentView,
    agentSubView,
    handleNavigateToAgents,
    handleNavigateToLogs,
    handleNavigateToCreate,
    selectedAgentId, // Add selectedAgentId to dependency array
  ]);

  return (
    <AIAgentsLayout
      currentView={['list', 'detail', 'create', 'logs'].includes(currentView) ? currentView : 'list'}
      setCurrentView={setCurrentView}
      selectedAgentId={selectedAgentId}
      setSelectedAgentId={setSelectedAgentId}
      selectedSessionId={selectedSessionId}
      setSelectedSessionId={setSelectedSessionId}
      agentSubView={agentSubView}
      setAgentSubView={setAgentSubView}
      onNavigateToDetail={handleNavigateToDetail}
      onNavigateToCreate={handleNavigateToCreate}
      onNavigateBackToAgentList={handleNavigateBackToAgentList}
      // onNavigateToLogs and onNavigateToAgents are handled by the buttons set in headerNavNode
    />
  );
};

export default AIAgentsPage;
