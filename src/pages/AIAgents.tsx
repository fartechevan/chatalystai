import React, { useState, useEffect } from 'react';
import AIAgentsLayout from '@/components/ai-agents/AIAgentsLayout';
import { usePageActionContext } from '@/context/PageActionContext';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquareText } from 'lucide-react';
import type { ViewState as AIAgentsViewState } from '@/components/ai-agents/AIAgentsLayout'; // Import ViewState type

const AIAgentsPage = () => {
  const { setHeaderNavNode } = usePageActionContext();

  // State lifted from AIAgentsLayout
  const [currentView, setCurrentView] = useState<AIAgentsViewState>('list');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [agentSubView, setAgentSubView] = useState<'list' | 'detail' | 'create'>('list');


  // Navigation handlers lifted from AIAgentsLayout
  const handleNavigateToDetail = (agentId: string) => {
    setSelectedAgentId(agentId);
    setAgentSubView('detail');
    setCurrentView('detail');
  };

  const handleNavigateToCreate = () => {
    setSelectedAgentId(null);
    setAgentSubView('create');
    setCurrentView('create');
  };

  const handleNavigateBackToAgentList = () => {
    setSelectedAgentId(null);
    setAgentSubView('list');
    setCurrentView('list');
  };

  const handleNavigateToLogs = () => {
    setSelectedAgentId(null);
    setSelectedSessionId(null);
    setAgentSubView('list'); // Reset agent sub-view
    setCurrentView('logs');
  };

  const handleNavigateToAgents = () => {
    handleNavigateBackToAgentList();
  };

  useEffect(() => {
    const navButtons = (
      <>
        <Button
          variant={currentView !== 'logs' && agentSubView !== 'create' && agentSubView !== 'detail' ? 'secondary' : 'ghost'}
          onClick={handleNavigateToAgents}
          size="sm"
        >
          <Bot className="mr-2 h-4 w-4" />
          Agents
        </Button>
        <Button
          variant={currentView === 'logs' ? 'secondary' : 'ghost'}
          onClick={handleNavigateToLogs}
          size="sm"
        >
          <MessageSquareText className="mr-2 h-4 w-4" />
          Conversation Logs
        </Button>
      </>
    );
    setHeaderNavNode(navButtons);

    // Clear the header nav when the component unmounts
    return () => {
      setHeaderNavNode(null);
    };
  }, [setHeaderNavNode, currentView, agentSubView, handleNavigateToAgents, handleNavigateToLogs]);

  return (
    <AIAgentsLayout
      currentView={currentView}
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
