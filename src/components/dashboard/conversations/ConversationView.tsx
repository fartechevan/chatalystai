
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "./types";
import { ConversationLeftPanel } from "./ConversationLeftPanel";
import { ConversationMainArea } from "./ConversationMainArea";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import { useConversationData } from "./hooks/useConversationData";
import { useConversationRealtime } from "./useConversationRealtime";
import { supabase } from "@/integrations/supabase/client";

export function ConversationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leadDetailsExpanded, setLeadDetailsExpanded] = useState(true);
  const [participantsData, setParticipantsData] = useState<Record<string, any>>({});
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

  // Fetch participants data for all conversations
  useEffect(() => {
    const loadParticipantsData = async () => {
      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('id, conversation_id, role, external_user_identifier');
        
        if (error) {
          console.error('Error loading participants:', error);
          return;
        }

        // Create a mapping of conversation_id to participant data
        const participantsMap: Record<string, any> = {};
        for (const participant of data || []) {
          if (!participantsMap[participant.conversation_id]) {
            participantsMap[participant.conversation_id] = [];
          }
          participantsMap[participant.conversation_id].push(participant);
        }

        setParticipantsData(participantsMap);
      } catch (err) {
        console.error('Error in participant data processing:', err);
      }
    };

    loadParticipantsData();
  }, []);

  // Process conversations to add customer_name from participants
  const processedConversations = conversations.map(conv => {
    const conversationParticipants = participantsData[conv.conversation_id] || [];
    
    // Find member participant (customer)
    const memberParticipant = conversationParticipants.find(
      (p: any) => p.role === 'member'
    );
    
    // Set customer_name if member participant exists
    if (memberParticipant && memberParticipant.external_user_identifier) {
      return {
        ...conv,
        customer_name: memberParticipant.external_user_identifier
      };
    }
    
    return conv;
  });

  const filteredConversations = processedConversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    
    // Search in lead data
    if (conv.lead) {
      // Check if lead has contact_first_name property and it includes the search term
      if (conv.lead.contact_first_name && 
          typeof conv.lead.contact_first_name === 'string' && 
          conv.lead.contact_first_name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Check if lead has name property and it includes the search term
      if (conv.lead.name && 
          typeof conv.lead.name === 'string' && 
          conv.lead.name.toLowerCase().includes(searchLower)) {
        return true;
      }
    }
    
    // Search in customer_name if it exists
    if (conv.customer_name && 
        typeof conv.customer_name === 'string' && 
        conv.customer_name.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in lead_id
    if (conv.lead_id && 
        typeof conv.lead_id === 'string' && 
        conv.lead_id.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
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
