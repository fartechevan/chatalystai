
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
  const getCustomerFromConversation = (conversation: Conversation) => {
    return conversation.sender_type === 'customer' ? conversation.sender : conversation.receiver;
  };

  const getDisplayName = (conversation: Conversation) => {
    const customer = getCustomerFromConversation(conversation);
    return customer.name || customer.email || `Customer ${customer.id.slice(0, 8)}`;
  };

  const getAvatarInitial = (conversation: Conversation) => {
    const customer = getCustomerFromConversation(conversation);
    if (customer.name) return customer.name[0].toUpperCase();
    if (customer.email) return customer.email[0].toUpperCase();
    return 'C';
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
            <Badge variant="secondary" className="ml-2">1</Badge>
          </Button>
        </div>

        <ScrollArea className="flex-1">
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
                      Lead #{conv.conversation_id.slice(0, 6)}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {getDisplayName(conv)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
