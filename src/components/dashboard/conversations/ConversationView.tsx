import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // Added SheetHeader, SheetTitle
import { Button } from "@/components/ui/button";
import { UserCog, PanelLeft, PanelRightOpen } from "lucide-react"; // Added PanelRightOpen
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
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
} from "./utils/conversationProcessing";

export function ConversationView() {
  // const [searchQuery, setSearchQuery] = useState(""); // Moved to ConversationLeftPanel
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isMobileConvoListDrawerOpen, setIsMobileConvoListDrawerOpen] = useState(false);
  const [isLeadDetailsDrawerOpen, setIsLeadDetailsDrawerOpen] = useState(false); // Renamed

  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // lg breakpoint

  const {
    conversations,
    messages,
    isLoading: isLoadingConversationData,
    isFetchingNextPage, // Added
    hasNextPage, // Added
    fetchNextPage, // Added
    summary,
    summaryTimestamp,
    sendMessageMutation,
    summarizeMutation
  } = useConversationData(selectedConversation);

  const { participantsData, isLoadingParticipants } = useParticipantsData();
  const { customersData, isLoadingCustomers } = useCustomersData();

  useConversationRealtime(queryClient, selectedConversation);

  const isLoading = isLoadingConversationData || isLoadingParticipants || isLoadingCustomers;

  const processedConversations = useMemo(() => {
    // Pass raw conversations here; ConversationLeftPanel will do its own filtering
    return processConversationsWithCustomerNames(conversations, participantsData, customersData);
  }, [conversations, participantsData, customersData]);

  // Filtering is now done inside ConversationLeftPanel
  // const filteredConversations = useMemo(() => {
  //   return filterConversations(processedConversations, customersData, searchQuery);
  // }, [processedConversations, customersData, searchQuery]);

  useEffect(() => {
    if (!isDesktop && selectedConversation) {
      setIsMobileConvoListDrawerOpen(false);
    }
  }, [selectedConversation, isDesktop]);

  const handleSelectConversation = (conversation: Conversation | null) => {
    setSelectedConversation(conversation);
    if (!isDesktop) {
      setIsMobileConvoListDrawerOpen(false);
      // setIsMobileLeadDetailsDrawerOpen(false); // Keep lead details open if user explicitly opened it
    }
  };

  const handleSendMessage = (messageText: string, file?: File) => { // Updated signature
    if ((!messageText.trim() && !file) || !selectedConversation) return; // Check for text or file
    
    const customerParticipant = selectedConversation.participants?.find(p => p.customer_id);
    const recipientCustomer = customerParticipant?.customer_id
      ? customersData?.[customerParticipant.customer_id]
      : null;
    const recipientPhone = recipientCustomer?.phone_number; // This is the plain phone number

    // Attempt to get the JID (chatId for Evolution API) from the customer participant
    const customerJid = customerParticipant?.external_user_identifier;

    if (!customerJid) {
      console.error("Could not determine recipient JID (external_user_identifier) for conversation:", selectedConversation.conversation_id);
      // Fallback or error handling if JID is not found
      // For now, let's try to construct it if only phone is available, though this might not always be correct for groups
      if (recipientPhone && selectedConversation.integrations_id) { // Assuming WhatsApp if integrations_id exists
        // This is a guess, actual JID format might vary or be directly available
        // console.warn(`Attempting to construct JID from phone number: ${recipientPhone}@c.us`);
        // customerJid = `${recipientPhone}@c.us`; 
        // It's safer to ensure external_user_identifier is populated correctly.
        // For now, if external_user_identifier is missing, we cannot reliably send.
         console.error("Critical: external_user_identifier (JID) for the customer participant is missing.");
        return;
      } else {
        return;
      }
    }
    
    const instanceId = selectedConversation.integrations_id; // This is the Evolution instance name/ID
    if (!instanceId) {
      console.error("Could not determine instance ID (integrations_id) for conversation:", selectedConversation.conversation_id);
      return;
    }

    sendMessageMutation.mutate({
      // instanceId: instanceId, // This is passed to useEvolutionAPI, so it should be available in its context
      chatId: customerJid, // Use the JID from external_user_identifier
      message: messageText.trim(), // Use the passed messageText
      file: file, // Pass the file
    });
    setNewMessage(""); // Clear input after attempting to send
  };

  const conversationListPanelContent = (
    <ConversationLeftPanel
      // searchQuery and setSearchQuery removed
      conversations={processedConversations || []} // Pass processed (but unfiltered) conversations
      customersData={customersData} // Pass customersData for filtering inside
      selectedConversation={selectedConversation}
      setSelectedConversation={handleSelectConversation}
      onConversationSelect={() => { // Re-added for mobile drawer closing, as it's in ConversationLeftPanel's props
        if(!isDesktop) setIsMobileConvoListDrawerOpen(false);
      }}
    />
  );

  const leadDetailsPanelContent = selectedConversation ? (
    <LeadDetailsPanel
      selectedConversation={selectedConversation}
      setSelectedConversation={handleSelectConversation}
      queryClient={queryClient}
      onClose={() => setIsLeadDetailsDrawerOpen(false)} // Use renamed state setter
    />
  ) : null;

  const currentChatPartnerName = useMemo(() => {
    if (!selectedConversation || !participantsData || !customersData) return "Chat";
    const partnerParticipant = selectedConversation.participants?.find(p => p.customer_id);
    if (partnerParticipant?.customer_id && customersData[partnerParticipant.customer_id]) {
      return customersData[partnerParticipant.customer_id].name || customersData[partnerParticipant.customer_id].phone_number || "Chat";
    }
    return "Chat";
  }, [selectedConversation, participantsData, customersData]);


  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden bg-background text-foreground">
      
      {/* Mobile Header Bar for Triggers */}
      {!isDesktop && (
        <div className="p-2 border-b flex items-center gap-2 lg:hidden sticky top-0 bg-background z-10">
          <Sheet open={isMobileConvoListDrawerOpen} onOpenChange={setIsMobileConvoListDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open Conversations List">
                <PanelLeft className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 sm:w-[320px] bg-card flex flex-col">
              <SheetHeader>
                <SheetTitle className="sr-only">Conversations List</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-auto"> {/* Add a wrapper for scrolling if panel content doesn't manage it */}
                {conversationListPanelContent}
              </div>
            </SheetContent>
          </Sheet>
          
          <h1 className="text-md font-semibold flex-1 truncate text-center px-2">
            {selectedConversation ? currentChatPartnerName : "Inbox"}
          </h1>

          {/* Mobile Lead Details Trigger - This button will now also be the primary way to open it on desktop if no other trigger is added */}
          {selectedConversation && (
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Toggle Lead Details" // Changed aria-label
              onClick={() => setIsLeadDetailsDrawerOpen(prev => !prev)} // Toggle state
              className="lg:hidden" 
            >
              <UserCog className="h-5 w-5" />
            </Button>
          )}
          {!selectedConversation && <div className="w-10 h-10 lg:hidden" /> /* Placeholder */}
        </div>
      )}

      {/* Desktop Left Panel (Conversation List) */}
      {isDesktop && (
        <div className="w-[240px] lg:w-[280px] xl:w-[300px] bg-card border-r flex-shrink-0 hidden lg:flex flex-col h-full"> {/* Added h-full */}
          {conversationListPanelContent}
        </div>
      )}

      {/* Wrapper for Main Conversation Area */}
      {/* The desktop trigger button for lead details will be moved to ConversationHeader */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 relative", // Keep relative if ConversationMainArea needs it for internal absolute elements
        "bg-background flex-grow"
      )}>
        <ConversationMainArea
          key={selectedConversation?.conversation_id || 'empty'}
          onOpenLeadDetails={() => setIsLeadDetailsDrawerOpen(prev => !prev)} // Changed to toggle
          selectedConversation={selectedConversation}
          isLoading={isLoadingConversationData} // Use specific loading state for initial data
          messages={messages}
          isFetchingNextPage={isFetchingNextPage} // Pass down
          hasNextPage={hasNextPage} // Pass down
          fetchNextPage={fetchNextPage} // Pass down
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            sendMessageMutation={sendMessageMutation}
            summarizeMutation={summarizeMutation}
            summary={summary}
            summaryTimestamp={summaryTimestamp}
            isDesktop={isDesktop}
            partnerName={currentChatPartnerName}
          />
      </div> {/* This closes the main conversation area wrapper */}

      {/* Lead Details Panel - Drawer on mobile, "Push" panel on desktop */}
      {selectedConversation && (
        <>
          {/* Mobile: Drawer */}
          {!isDesktop && (
            <Sheet open={isLeadDetailsDrawerOpen} onOpenChange={setIsLeadDetailsDrawerOpen}>
              <SheetContent 
                side="right" 
                className="p-0 w-full sm:w-[350px] bg-card flex flex-col"
              >
                <SheetHeader>
                  <SheetTitle className="sr-only">Lead Details</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-auto"> {/* Add a wrapper for scrolling if panel content doesn't manage it */}
                  {leadDetailsPanelContent}
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Desktop: Conditionally rendered "push" panel */}
          {isDesktop && isLeadDetailsDrawerOpen && (
            <div className="w-[280px] lg:w-[320px] xl:w-[350px] bg-card border-l flex-shrink-0 flex flex-col h-full"> {/* Added h-full */}
              {leadDetailsPanelContent}
            </div>
          )}
        </>
      )}
    </div>
  );
}
