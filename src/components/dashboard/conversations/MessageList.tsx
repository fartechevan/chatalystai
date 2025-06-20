
import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./components/MessageItem";
import type { Conversation, Message as MessageType } from "./types";

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  conversation: Conversation | null;
  onMediaPreviewRequest: (message: MessageType) => void; // Add this prop
}

export function MessageList({ messages, isLoading, conversation, onMediaPreviewRequest }: MessageListProps) { // Destructure here
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-scroll">
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col gap-4 p-4 w-full">
          {messages.map((message) => (
            <MessageItem 
              key={message.message_id} 
              message={message} 
              conversation={conversation}
              onMediaPreviewRequest={onMediaPreviewRequest} // Pass it down
            />
          ))}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
