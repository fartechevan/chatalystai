
import { X, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const getDisplayName = (user: { name: string | null; email: string } | null) => {
    if (!user) return 'Unknown User';
    return user.name || user.email;
  };

  const getAvatarInitial = (user: { name: string | null; email: string } | null) => {
    if (!user) return '?';
    return user.name?.[0] || user.email[0].toUpperCase();
  };

  return (
    <div className={`${leftPanelOpen ? 'w-64' : 'w-12'} border-r bg-muted/30 transition-all duration-300 relative md:w-80 flex flex-col`}>
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="md:hidden absolute right-0 top-0 p-2 transform translate-x-full bg-background border rounded-r-lg"
      >
        {leftPanelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      
      <div className={`${leftPanelOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity duration-300 flex flex-col h-full`}>
        <div className="p-4 border-b">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {filteredConversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer ${
                  selectedConversation?.conversation_id === conv.conversation_id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getAvatarInitial(conv.sender)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getDisplayName(conv.sender)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
