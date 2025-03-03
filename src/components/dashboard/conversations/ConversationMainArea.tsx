
import { useState, useRef, useEffect } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation, Message as MessageType } from "./types";
import { ConversationHeader } from "./ConversationHeader";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  conversation: Conversation | null;
}

function MessageList({ messages, isLoading, conversation }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-scroll">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-4 p-4">
          {messages.map((message) => (
            <MessageItem key={message.message_id} message={message} conversation={conversation} />
          ))}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

// Modified Message component to determine admin status from conversation participant role
function MessageItem({ message, conversation }: { message: MessageType; conversation: Conversation | null }) {
  // Determine if this message is from an admin based on the sender_participant_id
  // We need to check if the sender's participant ID corresponds to an admin role in the conversation
  const isAdmin = conversation?.participants?.some(
    participant => participant.id === message.sender_participant_id && participant.role === 'admin'
  ) || false;
  
  return (
    <div
      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[70%] items-start gap-2 ${
          isAdmin ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <Avatar className="h-8 w-8">
          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {isAdmin ? 'A' : 'U'}
          </div>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isAdmin ? 'Admin' : 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div
            className={`rounded-lg p-3 ${
              isAdmin
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p className="text-sm">{message.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: any;
}

function MessageInput({
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
}: MessageInputProps) {
  const { toast } = useToast();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim()) return;

    handleSendMessage();
  };

  return (
    <div className="border-t p-4">
      <form onSubmit={onSubmit} className="relative flex items-center">
        <Input
          type="text"
          placeholder="Type your message here..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="rounded-full py-2 pr-12"
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          className="absolute right-2 rounded-full"
          disabled={sendMessageMutation.isPending || !newMessage.trim()}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
