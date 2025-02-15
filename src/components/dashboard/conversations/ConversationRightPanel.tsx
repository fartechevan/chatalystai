
import { X, Menu } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation, Message } from "./types";

interface ConversationRightPanelProps {
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  selectedConversation: Conversation | null;
  messages: Message[];
}

export function ConversationRightPanel({
  rightPanelOpen,
  setRightPanelOpen,
  selectedConversation,
  messages
}: ConversationRightPanelProps) {
  return (
    <div className={`${rightPanelOpen ? 'w-64' : 'w-12'} border-l bg-muted/30 transition-all duration-300 relative md:w-64`}>
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="md:hidden absolute left-0 top-0 p-2 transform -translate-x-full bg-background border rounded-l-lg"
      >
        {rightPanelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      
      <div className={`${rightPanelOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity duration-300`}>
        <div className="p-4 border-b">
          <h3 className="font-medium">User Details</h3>
        </div>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="space-y-4 p-4">
            {selectedConversation && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback>
                      {selectedConversation.receiver.name?.[0] || 
                       selectedConversation.receiver.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedConversation.receiver.name || 
                       selectedConversation.receiver.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.receiver.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Chat Info</h4>
                  <div className="text-sm">
                    <p>Started: {new Date(selectedConversation.created_at).toLocaleString()}</p>
                    <p>Messages: {messages.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
