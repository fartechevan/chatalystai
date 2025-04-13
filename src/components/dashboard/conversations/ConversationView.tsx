
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; 
import { Button } from "@/components/ui/button"; 
import { SidebarOpen, UserCog } from "lucide-react"; 
import { cn } from "@/lib/utils"; 
import { useMediaQuery } from "@/hooks/use-media-query"; 
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { ConversationMainArea } from "./ConversationMainArea";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import { ConversationHeader } from "./ConversationHeader"; 
import { useConversationData } from "./hooks/useConversationData";
import { useConversationRealtime } from "./useConversationRealtime"; 
import { useParticipantsData } from "./hooks/useParticipantsData";
import { useCustomersData } from "./hooks/useCustomersData"; 
import {
  processConversationsWithCustomerNames,
  filterConversations
} from "./utils/conversationProcessing";

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  // Mobile drawer states
  const [isMobileConvoListDrawerOpen, setIsMobileConvoListDrawerOpen] = useState(false);
  const [isMobileLeadDetailsDrawerOpen, setIsMobileLeadDetailsDrawerOpen] = useState(false);
  
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // Use lg breakpoint for 3 panels

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

  // Fetch participants and customers data (needed for processing/filtering)
  const { participantsData, isLoadingParticipants } = useParticipantsData();
  const { customersData, isLoadingCustomers } = useCustomersData(); 

  // Setup real-time updates for conversations
  useConversationRealtime(queryClient, selectedConversation);

  // Combine loading states
  const isLoading = isLoadingConversationData || isLoadingParticipants || isLoadingCustomers;

  // Process conversations to include customer names (memoized)
  const processedConversations = useMemo(() => {
    return processConversationsWithCustomerNames(conversations, participantsData, customersData); 
  }, [conversations, participantsData, customersData]);

  // Filter conversations based on search query (memoized)
  const filteredConversations = useMemo(() => {
    return filterConversations(processedConversations, customersData, searchQuery); 
  }, [processedConversations, customersData, searchQuery]);

  // --- Handlers ---
  const handleSelectConversation = (conversation: Conversation | null) => {
    setSelectedConversation(conversation);
    // Close drawers on mobile when a conversation is selected
    if (!isDesktop) {
      setIsMobileConvoListDrawerOpen(false);
      setIsMobileLeadDetailsDrawerOpen(false); 
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // --- Determine recipient phone ---
    const customerParticipant = selectedConversation.participants?.find(p => p.customer_id);
    const recipientCustomer = customerParticipant?.customer_id 
      ? customersData?.[customerParticipant.customer_id]
      : null;
    const recipientPhone = recipientCustomer?.phone_number;

    if (!recipientPhone) {
      console.error("Could not determine recipient phone number for conversation:", selectedConversation.conversation_id);
      return; 
    }
    
    // --- Determine instance ID ---
    const instanceId = selectedConversation.integrations_id;
    if (!instanceId) {
      console.error("Could not determine instance ID for conversation:", selectedConversation.conversation_id);
      return;
    }

    sendMessageMutation.mutate(newMessage.trim());
    setNewMessage("");
  };

  // --- Extracted Panel Components ---
  const conversationListPanel = (
     <ConversationLeftPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredConversations={filteredConversations} 
        selectedConversation={selectedConversation}
        setSelectedConversation={handleSelectConversation}
      />
  );

  const leadDetailsPanel = selectedConversation ? (
      <LeadDetailsPanel
        selectedConversation={selectedConversation}
        setSelectedConversation={handleSelectConversation}
        queryClient={queryClient}
      />
  ) : null;


  return (
    <div className="flex h-full"> 
      
      {/* Mobile Drawers & Trigger Area */}
      {!isDesktop && (
        <div className="p-2 border-r flex flex-col gap-2"> 
          {/* Convo List Drawer Trigger */}
          <Sheet open={isMobileConvoListDrawerOpen} onOpenChange={setIsMobileConvoListDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open Conversations List">
                <SidebarOpen className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 [&>button]:hidden">
              {conversationListPanel}
            </SheetContent>
          </Sheet>

           {/* Lead Details Drawer Trigger (only show if a convo is selected) */}
           {selectedConversation && (
             <Sheet open={isMobileLeadDetailsDrawerOpen} onOpenChange={setIsMobileLeadDetailsDrawerOpen}>
               <SheetTrigger asChild>
                 <Button variant="outline" size="icon" aria-label="Open Lead Details">
                   <UserCog className="h-5 w-5" /> 
                 </Button>
               </SheetTrigger>
               <SheetContent side="right" className="p-0 w-80 [&>button]:hidden">
                 {leadDetailsPanel}
               </SheetContent>
             </Sheet>
           )}
        </div>
      )}

      {/* Desktop Layout */}
      {isDesktop && (
        <>
          {/* Desktop Left Panel (Conversation List) */}
          <div className="w-80 border-r flex-shrink-0">
            {conversationListPanel}
          </div>

           {/* Desktop Right Panel (Lead Details) */}
           {selectedConversation && (
              <div className="w-96 border-l flex-shrink-0">
                {leadDetailsPanel}
              </div>
           )}
        </>
      )}

      {/* Main Conversation Area (Common for Mobile/Desktop) */}
      <div className="flex-1 flex flex-col min-w-0"> 
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
