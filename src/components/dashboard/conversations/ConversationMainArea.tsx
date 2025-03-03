import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/useUser";
import { summarizeConversation } from "./api/conversationActions";
import { createMessage, sendMessage } from "./api/messageActions";
import { Message } from "./Message";
import type { Conversation, Message as MessageType } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useSettings } from "@/hooks/useSettings";
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
            <Message key={message.message_id} message={message} />
          ))}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
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
  const { user } = useUser();
  const { settings } = useSettings();

  const onSubmit = async (event: any) => {
    event.preventDefault();
    if (!newMessage.trim()) return;

    if (!user?.email) {
      toast({
        title: "Please sign in",
        description: "You must be signed in to send messages.",
      });
      return;
    }

    if (!settings?.agent_name) {
      toast({
        title: "Please set your agent name",
        description: "You must set your agent name in the settings to send messages.",
      });
      return;
    }

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
          isLoading={sendMessageMutation.isPending}
          disabled={sendMessageMutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
