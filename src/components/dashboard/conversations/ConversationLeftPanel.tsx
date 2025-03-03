
import { X, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Conversation } from "./types";

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
    if (conversation.lead?.contact_first_name) {
      return conversation.lead.contact_first_name[0].toUpperCase();
    }
    if (conversation.customer_name && conversation.customer_name.length > 0) {
      return conversation.customer_name[0].toUpperCase();
    }
    return 'U';
  };

  const getConversationName = (conversation: Conversation) => {
    // First try to get name from lead
    if (conversation.lead) {
      // Prefer contact_first_name if available
      if (conversation.lead.contact_first_name) {
        return conversation.lead.contact_first_name;
      }
      // Otherwise use lead name
      if (conversation.lead.name) {
        return conversation.lead.name;
      }
    }
    
    // Fallback to customer_name from conversation
    if (conversation.customer_name) {
      return conversation.customer_name;
    }
    
    // Last resort: use lead_id
    if (conversation.lead_id) {
      return `Lead #${conversation.lead_id.slice(0, 6)}`;
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
          <Button variant="secondary" className="w-full justify-start" size="sm">
            Open conversations
            <Badge variant="secondary" className="ml-2">{filteredConversations.length || 0}</Badge>
          </Button>
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
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {conv.lead_id ? `Lead #${conv.lead_id.slice(0, 6)}` : 'No lead'}
                    </p>
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
