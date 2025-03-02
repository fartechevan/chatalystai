
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { ConversationMainArea } from "./ConversationMainArea";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import { useConversationData } from "./hooks/useConversationData";
import { useConversationRealtime } from "./useConversationRealtime";

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leadDetailsExpanded, setLeadDetailsExpanded] = useState(true);
  const queryClient = useQueryClient();

  const {
    conversations,
    messages,
    isLoading,
    newMessage,
    setNewMessage,
    summary,
    summaryTimestamp,
    sendMessageMutation,
    summarizeMutation
  } = useConversationData(selectedConversation);

  useConversationRealtime(queryClient, selectedConversation);

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    return (
      // Safely handle potentially undefined or null values
      (conv.lead?.name?.toLowerCase().includes(searchLower) || 
       conv.lead?.contact_first_name?.toLowerCase().includes(searchLower) || 
       conv.lead_id?.toLowerCase().includes(searchLower) || 
       false)
    );
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  return (
    <div className="h-screen flex flex-col relative -mt-8 -mx-8">
      <div className="flex-1 flex min-h-0">
        <ConversationLeftPanel
          leftPanelOpen={leftPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredConversations={filteredConversations}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />

        <LeadDetailsPanel 
          isExpanded={leadDetailsExpanded}
          onToggle={() => setLeadDetailsExpanded(!leadDetailsExpanded)}
          selectedConversation={selectedConversation}
        />

        <ConversationMainArea
          selectedConversation={selectedConversation}
          isLoading={isLoading}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          sendMessageMutation={sendMessageMutation}
          summarizeMutation={summarizeMutation}
          summary={summary}
          summaryTimestamp={summaryTimestamp}
        />
      </div>
    </div>
  );
}
