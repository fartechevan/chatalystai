
import { X, Menu, Search, Settings, MessageSquarePlus } from "lucide-react"; // Added MessageSquarePlus
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Conversation } from "./types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "./types/customer";
import { BroadcastModal } from "./BroadcastModal";
// Removed useQuery import
import { cn } from "@/lib/utils"; // Added cn

interface ConversationLeftPanelProps {
  // Removed leftPanelOpen and setLeftPanelOpen props
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredConversations: Conversation[];
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void; // Allow null
}

export function ConversationLeftPanel({
  // Removed leftPanelOpen, setLeftPanelOpen
  searchQuery,
  setSearchQuery,
  filteredConversations,
  selectedConversation,
  setSelectedConversation,
}: ConversationLeftPanelProps) {
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const getAvatarInitial = (conversation: Conversation) => {
    const displayName = getConversationName(conversation);
    return displayName.charAt(0).toUpperCase();
  };

  const getConversationName = (conversation: Conversation) => {
    // First priority: Use customer_name if it exists and is not empty
    if (conversation.customer_name && conversation.customer_name.trim() !== '') {
       return conversation.customer_name;
     }
 
     // Removed second priority block that used lead details
     
     // Now Third priority (was previously third): Check for participants with external_user_identifier (phone number)
     if (conversation.participants && conversation.participants.length > 0) {
       const memberParticipant = conversation.participants.find(p => p.role === 'member');
      if (memberParticipant && memberParticipant.external_user_identifier) {
        return memberParticipant.external_user_identifier;
      }
    }

    return 'Unknown Customer';
  };

  return (
    // Removed width classes (controlled by parent), added h-full
    <div className={cn("border-r bg-background flex flex-col h-full")}> 
      {/* Removed internal mobile toggle button */}
      
      {/* Content always visible now, parent controls visibility */}
      <div className="flex flex-col h-full"> 
        <div className="p-4 border-b flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1"> 
              <h3 className="font-medium text-sm">INBOX</h3>
            </div>
            {/* Add New Broadcast Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsBroadcastModalOpen(true)}
              title="New Broadcast"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.conversation_id}
                  className={`w-full flex items-start gap-3 p-4 hover:bg-muted text-left ${
                    selectedConversation?.conversation_id === conv.conversation_id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getAvatarInitial(conv)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {getConversationName(conv)}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                         {new Date(conv.updated_at).toLocaleDateString()}
                       </span>
                     </div>
                     {/* Removed the display of lead_id */}
                   </div>
                 </button>
               ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Render the Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        // Removed integrationId and instanceName props
      />
    </div>
  );
}
