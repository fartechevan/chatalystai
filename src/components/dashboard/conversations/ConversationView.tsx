import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Added Sheet
import { Button } from "@/components/ui/button"; // Added Button
import { SidebarOpen, UserCog } from "lucide-react"; // Added Icons
import { cn } from "@/lib/utils"; // Added cn
import { useMediaQuery } from "@/hooks/use-media-query"; // Added hook
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { ConversationMainArea } from "./ConversationMainArea";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import { ConversationHeader } from "./ConversationHeader"; // Assuming header exists for triggers
import { useConversationData } from "./hooks/useConversationData";
import { useConversationRealtime } from "./useConversationRealtime"; 
import { useParticipantsData } from "./hooks/useParticipantsData";
import { useCustomersData } from "./hooks/useCustomersData"; // Check this hook's return type
import {
  processConversationsWithCustomerNames,
  filterConversations
} from "./utils/conversationProcessing";

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  // Desktop states (can add collapse later if needed)
  // const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false); 
  // const [leadDetailsCollapsed, setLeadDetailsCollapsed] = useState(false);
  // Mobile drawer states
  const [isMobileConvoListDrawerOpen, setIsMobileConvoListDrawerOpen] = useState(false);
  const [isMobileLeadDetailsDrawerOpen, setIsMobileLeadDetailsDrawerOpen] = useState(false);
  
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // Use lg breakpoint for 3 panels

  // Fetch core conversation data
  const {
    conversations, // Raw conversations
    messages, // Messages for selected convo
    isLoading: isLoadingConversationData, // Loading state for convos/messages
    summary, // Summary for selected convo
    summaryTimestamp, // Timestamp for summary
    sendMessageMutation, // Mutation to send message
    summarizeMutation // Mutation to generate summary
  } = useConversationData(selectedConversation);

  // Fetch participants and customers data (needed for processing/filtering)
  const { participantsData, isLoadingParticipants } = useParticipantsData();
  // Ensure the hook returns Customer[] | undefined
  const { customersData, isLoadingCustomers } = useCustomersData(); 

  // Setup real-time updates for conversations
  useConversationRealtime(queryClient, selectedConversation);

  // Combine loading states
  const isLoading = isLoadingConversationData || isLoadingParticipants || isLoadingCustomers;

  // Process conversations to include customer names (memoized)
  const processedConversations = useMemo(() => {
    // Pass the customersData record directly
    return processConversationsWithCustomerNames(conversations, participantsData, customersData); 
  }, [conversations, participantsData, customersData]);

  // Filter conversations based on search query (memoized)
  const filteredConversations = useMemo(() => {
    // Pass the customersData record directly
    return filterConversations(processedConversations, customersData, searchQuery); 
  }, [processedConversations, customersData, searchQuery]);

  // --- Handlers ---
  const handleSelectConversation = (conversation: Conversation | null) => {
    // console.log("Selected Conversation:", conversation); // Debugging log
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
    // Option 1: Find customer participant and look up phone in customersData (using Record access)
    const customerParticipant = selectedConversation.participants?.find(p => p.customer_id);
    const recipientCustomer = customerParticipant?.customer_id 
      ? customersData?.[customerParticipant.customer_id] // Access using key
      : null;
    const recipientPhone = recipientCustomer?.phone_number;

    // Option 2: Fallback or alternative logic if needed (e.g., from lead?)
    // const recipientPhone = selectedConversation.lead?.phone || 'fallback_phone'; 

    if (!recipientPhone) {
      console.error("Could not determine recipient phone number for conversation:", selectedConversation.conversation_id);
      // Optionally show a toast message to the user
      return; 
    }
    
    // --- Determine instance ID ---
    const instanceId = selectedConversation.integrations_id; // Assuming integrations_id is the instanceId
    if (!instanceId) {
      console.error("Could not determine instance ID for conversation:", selectedConversation.conversation_id);
      // Optionally show a toast message
      return;
    }

    // --- Determine Sender ID (Placeholder - Needs real implementation) ---
    // const senderId = 'agent'; // TODO: Replace with actual logged-in user/agent ID

    // Revert mutate call: Assume the hook handles context internally
    sendMessageMutation.mutate(newMessage.trim());
    setNewMessage("");
  };

  // --- Render Logic ---

  // Extracted Panel Components for reuse in Drawers/Desktop
  const conversationListPanel = (
     <ConversationLeftPanel
        // Pass necessary props, adjust based on ConversationLeftPanel needs
        // leftPanelOpen={isDesktop ? !leftPanelCollapsed : true} // Example if collapsible
        // setLeftPanelOpen={isDesktop ? () => setLeftPanelCollapsed(!leftPanelCollapsed) : () => {}} // Example
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredConversations={filteredConversations} 
        selectedConversation={selectedConversation}
        setSelectedConversation={handleSelectConversation} // Use wrapper handler
        // Removed isLoading prop
      />
  );

  const leadDetailsPanel = selectedConversation ? (
      <LeadDetailsPanel
        // Pass necessary props, adjust based on LeadDetailsPanel needs
        // isExpanded={isDesktop ? !leadDetailsCollapsed : true} // Example if collapsible
        // onToggle={isDesktop ? () => setLeadDetailsCollapsed(!leadDetailsCollapsed) : () => {}} // Example
        selectedConversation={selectedConversation}
        setSelectedConversation={handleSelectConversation} // Use wrapper handler
        queryClient={queryClient}
        // Removed onClose prop
      />
  ) : null;


  return (
    // Use h-full, remove negative margins if they exist from parent
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
            <SheetContent side="left" className="p-0 w-80 [&>button]:hidden"> {/* Adjust width */}
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
               <SheetContent side="right" className="p-0 w-80 [&>button]:hidden"> {/* Adjust width */}
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
          <div className={cn(
            "w-80 border-r flex-shrink-0", // Adjust width as needed
            // Add collapse classes here if implementing desktop collapse
          )}>
            {conversationListPanel}
          </div>

           {/* Desktop Right Panel (Lead Details) */}
           {/* Render only if a conversation is selected */}
           {selectedConversation && (
              <div className={cn(
                "w-96 border-l flex-shrink-0", // Adjust width as needed
                 // Add collapse classes here if implementing desktop collapse
              )}>
                {leadDetailsPanel}
              </div>
           )}
        </>
      )}

      {/* Main Conversation Area (Common for Mobile/Desktop) */}
      <div className="flex-1 flex flex-col min-w-0"> {/* Added min-w-0 */}
         {/* Header might be needed here for context or mobile triggers */}
         {/* <ConversationHeader selectedConversation={selectedConversation} /> */}
         <ConversationMainArea
            selectedConversation={selectedConversation}
            isLoading={isLoading} // Pass combined loading state
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            sendMessageMutation={sendMessageMutation}
            summarizeMutation={summarizeMutation}
            summary={summary}
            summaryTimestamp={summaryTimestamp}
          />
      </div> {/* End Main Conversation Area */}

    </div>
  );
}
