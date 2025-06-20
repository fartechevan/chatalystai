
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react"; // Reverted: Removed ImagePlus
import { useState, useRef, useEffect } from "react"; // Reverted: Removed ChangeEvent

interface Message {
  key: string;
  id: string;
  content: string;
  fromMe: boolean;
  timestamp: number;
  sender: string;
}

interface Chat {
  id: string;
  name: string;
}

interface ChatMainProps {
  selectedChat: Chat | undefined;
  messages: Message[];
  onSendMessage: (message: string) => void; // Reverted: Removed file parameter
  isLoading?: boolean;
}

export function ChatMain({ selectedChat, messages, onSendMessage, isLoading }: ChatMainProps) {
  const [newMessage, setNewMessage] = useState("");
  // Removed selectedFile state
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Removed fileInputRef

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return; // Reverted
    onSendMessage(newMessage); // Reverted
    setNewMessage("");
    // Removed file handling logic
  };

  // Removed handleFileChange
  // Removed handleAttachmentClick

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (!selectedChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{selectedChat.name}</h2>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.key}
              className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.fromMe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content.startsWith('data:image') ? (
                  <img src={message.content} alt="Sent image" className="max-w-xs max-h-xs rounded-md" />
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <span className="text-xs opacity-70 block mt-1">
                  {new Date(message.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        {/* Removed selectedFile display */}
        <div className="flex gap-2">
          {/* Removed file input and attachment button */}
          <Input
            placeholder="Type a message..." // Reverted placeholder
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            // Removed disabled attribute
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
