
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { UseMutationResult } from "@tanstack/react-query";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<any, Error, string, unknown>;  // Updated to accept any return type
  isWhatsAppConversation?: boolean;
  isLoading?: boolean;
  selectedConversation?: boolean;
}

export function MessageInput({
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
  isWhatsAppConversation = false,
  isLoading = false,
  selectedConversation = true
}: MessageInputProps) {
  const [rows, setRows] = useState(1);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && selectedConversation) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const lineCount = e.target.value.split('\n').length;
    setRows(Math.min(lineCount, 4)); // Maximum 4 rows
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-2">
        <Textarea
          placeholder={selectedConversation ? "Write your message..." : "Select a conversation to start messaging"}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          value={newMessage}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={!selectedConversation}
          rows={rows}
        />
        <Button size="icon" variant="ghost" disabled={!selectedConversation}>
          <Smile className="h-5 w-5" />
        </Button>
        <Button 
          size="icon"
          onClick={handleSendMessage}
          disabled={!selectedConversation || !newMessage.trim() || sendMessageMutation.isPending}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
