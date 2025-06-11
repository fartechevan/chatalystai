
import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button"; // Added Button
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./MessageItem";
import type { Conversation, Message as MessageType } from "../types";

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean; // For initial load
  isFetchingNextPage?: boolean; // For loading more (older) messages
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  conversation: Conversation | null;
}

export function MessageList({ 
  messages, 
  isLoading, 
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  conversation 
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); 
  
  // Refs to store scroll state for maintaining position when loading older messages
  const previousScrollHeightRef = useRef<number | null>(null);
  const previousScrollTopRef = useRef<number | null>(null);
  // Ref to track if the latest action was loading older messages
  const isLoadingOlderMessagesRef = useRef(false); // Corrected typo here


  console.log('MessageList props: isLoading:', isLoading, 'isFetchingNextPage:', isFetchingNextPage, 'hasNextPage:', hasNextPage, 'messages.length:', messages.length);
  
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    if (isFetchingNextPage) {
      // When "Load older messages" is initiated (isFetchingNextPage becomes true)
      previousScrollHeightRef.current = viewport.scrollHeight;
      previousScrollTopRef.current = viewport.scrollTop;
      isLoadingOlderMessagesRef.current = true;
    } else if (isLoadingOlderMessagesRef.current) {
      // This block executes right after older messages have been loaded (isFetchingNextPage becomes false)
      if (previousScrollHeightRef.current !== null && previousScrollTopRef.current !== null) {
        const newScrollHeight = viewport.scrollHeight;
        const scrollHeightDifference = newScrollHeight - previousScrollHeightRef.current;
        viewport.scrollTop = previousScrollTopRef.current + scrollHeightDifference;
      }
      isLoadingOlderMessagesRef.current = false; // Reset the flag
      previousScrollHeightRef.current = null; // Clear stored values
      previousScrollTopRef.current = null;
    } else if (messages.length > 0) {
      // This handles new messages sent/received, or initial load completion
      // For these cases, scroll to the bottom.
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFetchingNextPage]);

  // Effect for initial load scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !isFetchingNextPage && !isLoadingOlderMessagesRef.current) {
      // Only scroll to bottom on initial load if not currently handling older messages
      messagesEndRef.current?.scrollIntoView(); // Instant scroll
    }
  }, [isLoading, messages.length, conversation?.conversation_id]); // Depend on conversation ID to re-trigger for new convos


  // Since messages are loaded newest first (descending order from DB),
  // and we want to display them chronologically (oldest at top, newest at bottom),
  // we should reverse the `messages` array for display.
  // Pagination adds older messages, which will be at the end of the `allMessages` array
  // after flatMap, so reversing makes them appear at the top.
  const displayedMessages = [...messages].reverse();

  return (
    <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}> {/* Use standard ref prop */}
      <div className="flex flex-col gap-4 p-4">
        {hasNextPage && (
          <div className="flex justify-center my-2">
            <Button
              onClick={() => fetchNextPage?.()}
              disabled={isFetchingNextPage}
              variant="outline"
              size="sm"
            >
              {isFetchingNextPage ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load older messages
            </Button>
          </div>
        )}
        {isLoading && displayedMessages.length === 0 && ( // Show main loader only if no messages and initial loading
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {displayedMessages.map((message) => (
          <MessageItem 
            key={message.message_id} 
            message={message} 
            conversation={conversation} 
          />
        ))}
        <div ref={messagesEndRef} /> {/* Element to scroll to for new messages */}
      </div>
    </ScrollArea>
  );
}
