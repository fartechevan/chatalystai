
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./MessageItem";
import type { Conversation, Message as MessageType } from "../types";

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  conversation: Conversation | null;
}

export function MessageList({ messages, isLoading, conversation }: MessageListProps) {
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
            <MessageItem 
              key={message.message_id} 
              message={message} 
              conversation={conversation} 
            />
          ))}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
