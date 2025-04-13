import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface ChatPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Simple message type for demonstration
type ChatMessage = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
};

export function ChatPopup({ isOpen, onOpenChange }: ChatPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false); // To show loading state

  const handleSendMessage = async () => {
    const userMessage = inputValue.trim();
    if (!userMessage) return;

    const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    // --- TODO: Backend Interaction ---
    // Here you would typically:
    // 1. Send the userMessage to a backend function (e.g., a Supabase Edge Function).
    // 2. The backend function would interpret the query, interact with the database 
    //    (e.g., query conversations, messages, sentiment data based on the user's request).
    // 3. The backend would generate a response (text, maybe structured data/chart hints).
    try {
      // Call the backend function
      const { data, error } = await supabase.functions.invoke('query-data-with-ai', {
        body: { query: userMessage },
      });

      let botText = "Sorry, I couldn't process that request."; // Default error message
      if (error) {
        console.error("Error invoking query-data-with-ai function:", error);
        botText = `Error: ${error.message}`;
      } else if (data?.error) {
        // Handle errors returned *within* the function's response
        console.error("Function returned error:", data.error);
        botText = `Function Error: ${data.error}`;
      } else if (data?.response) {
        // Success case
        botText = data.response;
      }

      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
      };
      setMessages(prev => [...prev, botResponse]);

    } catch (invokeError) {
      // Catch potential errors during the invoke call itself
      console.error("Failed to invoke function:", invokeError);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "An unexpected error occurred while contacting the analysis service.",
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Analyze Conversation Data</SheetTitle>
          <SheetDescription>
            Ask questions about your conversation data (e.g., "Show conversations with bad sentiment", "Summarize conversation X").
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4 mb-4"> {/* Added padding adjustment */}
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
             {isLoading && (
               <div className="flex justify-start">
                 <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted animate-pulse">
                   Thinking...
                 </div>
               </div>
             )}
          </div>
        </ScrollArea>
        <SheetFooter className="mt-auto">
          <div className="flex w-full items-center space-x-2">
            <Input
              id="message"
              placeholder="Type your question..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoComplete="off"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
