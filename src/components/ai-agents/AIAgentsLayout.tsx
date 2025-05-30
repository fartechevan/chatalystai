import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { Bot, MessageSquareText } from 'lucide-react'; // Import icons
import AgentListPanel from './AgentListPanel';
import AgentDetailsPanel from './AgentDetailsPanel';
import AgentConversationLogs from './AgentConversationLogs';
import SessionListPanel from './SessionListPanel'; // Import the SessionListPanel
import { cn } from '@/lib/utils'; // Import cn for conditional classes
// Button import is removed as sidebar is removed

// Add 'logs' to the view state and export it
export type ViewState = 'list' | 'detail' | 'create' | 'logs';
type AgentSubView = 'list' | 'detail' | 'create';

interface AIAgentsLayoutProps {
  currentView: ViewState;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  selectedAgentId: string | null;
  setSelectedAgentId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedSessionId: string | null;
  setSelectedSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  agentSubView: AgentSubView;
  setAgentSubView: React.Dispatch<React.SetStateAction<AgentSubView>>;
  onNavigateToDetail: (agentId: string) => void;
  onNavigateToCreate: () => void;
  onNavigateBackToAgentList: () => void;
  // onNavigateToLogs and onNavigateToAgents are handled by parent via context
}

const AIAgentsLayout: React.FC<AIAgentsLayoutProps> = ({
  currentView,
  // setCurrentView, // Not directly used for navigation buttons here anymore
  selectedAgentId,
  // setSelectedAgentId, // Not directly used for navigation buttons here anymore
  selectedSessionId,
  setSelectedSessionId,
  agentSubView,
  // setAgentSubView, // Not directly used for navigation buttons here anymore
  onNavigateToDetail,
  onNavigateToCreate,
  onNavigateBackToAgentList,
}) => {
  // Internal state and handlers are removed, props are used instead.

  return (
    // The outer div no longer needs to be a flex container for a sidebar
    // It just needs to ensure its children can take up full height/width as needed.
    <div className="h-full w-full flex flex-col"> {/* Ensure it's a flex column for content growth */}
      {/* Sidebar is removed */}

      {/* Main Content Area - ensure it grows and has padding */}
      <div className="flex-grow flex flex-col p-4 space-y-4 overflow-auto"> {/* Added overflow-auto */}
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
                  onSelectAgent={onNavigateToDetail}
                  onInitiateCreate={onNavigateToCreate}
                />
              </div>
            ) : ( // 'detail' or 'create' sub-views take full width
              <div className="w-full h-full">
                <AgentDetailsPanel
                  selectedAgentId={selectedAgentId}
                  onAgentUpdate={onNavigateBackToAgentList} // Navigate back within agents section
                  onNavigateBack={onNavigateBackToAgentList} // Navigate back within agents section
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
