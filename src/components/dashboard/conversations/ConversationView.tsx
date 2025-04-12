import { useState, useEffect, useMemo } from "react"; // Added useMemo
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { ConversationMainArea } from "./ConversationMainArea";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import { useConversationData } from "./hooks/useConversationData";
import { useConversationRealtime } from "./useConversationRealtime";
import { useParticipantsData } from "./hooks/useParticipantsData";
import { useCustomersData } from "./hooks/useCustomersData";
import {
  processConversationsWithCustomerNames,
  filterConversations
} from "./utils/conversationProcessing"; // Import utility functions

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leadDetailsExpanded, setLeadDetailsExpanded] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  // Fetch core conversation data
  const {
    conversations,
    messages,
    isLoading: isLoadingConversationData,
    summary,
    summaryTimestamp,
    sendMessageMutation,
    summarizeMutation
  } = useConversationData(selectedConversation);

  // Fetch participants and customers data
  const { participantsData, isLoadingParticipants } = useParticipantsData();
  const { customersData, isLoadingCustomers } = useCustomersData();

  // Setup real-time updates
  useConversationRealtime(queryClient, selectedConversation);

  // Combine loading states
  const isLoading = isLoadingConversationData || isLoadingParticipants || isLoadingCustomers;

  // Process and filter conversations using utility functions and useMemo
  const processedConversations = useMemo(() => {
    return processConversationsWithCustomerNames(conversations, participantsData, customersData);
  }, [conversations, participantsData, customersData]);

  const filteredConversations = useMemo(() => {
    return filterConversations(processedConversations, customersData, searchQuery);
  }, [processedConversations, customersData, searchQuery]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
    setNewMessage("");
  };

  return (
    <div className="h-screen flex flex-col relative -mt-8 -mx-8">
      <div className="flex-1 flex min-h-0">
        <ConversationLeftPanel
          leftPanelOpen={leftPanelOpen}
          setLeftPanelOpen={setLeftPanelOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredConversations={filteredConversations} // Use memoized filtered list
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />

        <LeadDetailsPanel
          isExpanded={leadDetailsExpanded}
          onToggle={() => setLeadDetailsExpanded(!leadDetailsExpanded)}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          queryClient={queryClient}
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
