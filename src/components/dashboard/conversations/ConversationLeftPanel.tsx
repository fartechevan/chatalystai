import { X, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Conversation } from "./types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "./types/customer";

interface ConversationLeftPanelProps {
  leftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredConversations: Conversation[];
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation) => void;
}

export function ConversationLeftPanel({
  leftPanelOpen,
  setLeftPanelOpen,
  searchQuery,
  setSearchQuery,
  filteredConversations,
  selectedConversation,
  setSelectedConversation,
}: ConversationLeftPanelProps) {

  const getAvatarInitial = (conversation: Conversation) => {
    if (conversation.customer_name && conversation.customer_name.length > 0) {
      return conversation.customer_name[0].toUpperCase();
    }
    
    return 'U';
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.customer_name) {
      return conversation.customer_name;
    }

    if (conversation.lead) {
      return conversation.lead.name || conversation.lead.company_name || `Lead #${conversation.lead_id?.slice(0, 6)}`;
    }
    
    if (conversation.participants && conversation.participants.length > 0) {
      const firstMember = conversation.participants[0];
      if (firstMember.profiles?.email) {
        return firstMember.profiles.email;
      }
    }

    if (conversation.participants && conversation.participants.length > 0) {
      const firstMember = conversation.participants[0];
      if (firstMember.profiles?.email) {
        return firstMember.profiles.email;
      }
    }

    return 'Unknown Customer';
  };

  return (
    <div className={`${leftPanelOpen ? 'w-64' : 'w-12'} border-r bg-background transition-all duration-300 relative md:w-80 flex flex-col`}>
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="md:hidden absolute right-0 top-0 p-2 transform translate-x-full bg-background border rounded-r-lg"
      >
        {leftPanelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      
      <div className={`${leftPanelOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity duration-300 flex flex-col h-full`}>
        <div className="p-4 border-b flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <h3 className="font-medium text-sm">INBOX</h3>
            </div>
            <Button variant="ghost" size="icon">
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
                    {conv.lead_id && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {`Lead #${conv.lead_id.slice(0, 6)}`}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
