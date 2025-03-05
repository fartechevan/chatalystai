
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

import type { Conversation, Message as MessageType } from "./types";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";

interface ConversationMainAreaProps {
  selectedConversation: Conversation | null;
  isLoading: boolean;
  messages: MessageType[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: any;
  summarizeMutation: any;
  summary: string | undefined;
  summaryTimestamp: string | undefined;
}

export function ConversationMainArea({
  selectedConversation,
  isLoading,
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
  summarizeMutation,
  summary,
  summaryTimestamp
}: ConversationMainAreaProps) {
  const [isSummarized, setIsSummarized] = useState(!!summary);

  // Determine if this conversation is a WhatsApp conversation
  const isWhatsAppConversation = selectedConversation?.integrations_config_id ? true : false;

  return (
    <div className={`flex-1 flex flex-col min-h-0 border-r border-l relative ${!selectedConversation ? 'items-center justify-center' : ''}`}>
      {selectedConversation ? (
        <>
          <ConversationHeader conversation={selectedConversation} />
          
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            conversation={selectedConversation}
          />
          
          <MessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            sendMessageMutation={sendMessageMutation}
            isWhatsAppConversation={isWhatsAppConversation}
          />
          
          {summarizeMutation.isPending && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p>Summarizing conversation...</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
          <p className="text-muted-foreground">Choose a conversation from the list to start chatting</p>
        </div>
      )}
    </div>
  );
}
