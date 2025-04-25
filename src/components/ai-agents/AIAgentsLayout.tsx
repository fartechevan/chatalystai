import React, { useState } from 'react';
import AgentListPanel from './AgentListPanel';
import AgentDetailsPanel from './AgentDetailsPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

const AIAgentsLayout: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleSelectAgent = (agentId: string | null) => {
    setSelectedAgentId(agentId);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        {/* Middle Panel: List of Agents */}
        <div className="h-full p-1"> {/* Reduced padding */}
          <AgentListPanel
            selectedAgentId={selectedAgentId}
            onSelectAgent={handleSelectAgent}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={70}>
        {/* Right Panel: Agent Details / Create Form */}
        <div className="h-full p-1"> {/* Reduced padding */}
          <AgentDetailsPanel
             selectedAgentId={selectedAgentId}
             onAgentUpdate={() => setSelectedAgentId(null)} // Deselect after update/create/delete
             key={selectedAgentId || 'create'} // Force re-render/reset form when selection changes
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AIAgentsLayout;
