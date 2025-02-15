
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
  selectedConversation: boolean;
}

export function MessageInput({
  newMessage,
  setNewMessage,
  handleSendMessage,
  isLoading,
  selectedConversation
}: MessageInputProps) {
  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-2">
        <Input 
          placeholder={selectedConversation ? "Write your message..." : "Select a conversation to start messaging"}
          className="flex-1"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && selectedConversation) {
              handleSendMessage();
            }
          }}
          disabled={!selectedConversation}
        />
        <Button size="icon" variant="ghost" disabled={!selectedConversation}>
          <Smile className="h-5 w-5" />
        </Button>
        <Button 
          size="icon"
          onClick={handleSendMessage}
          disabled={!selectedConversation || !newMessage.trim() || isLoading}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
