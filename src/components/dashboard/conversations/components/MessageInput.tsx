
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query"; // Import UseMutationResult
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<unknown, Error, string, unknown>; // Use specific type
  isWhatsAppConversation?: boolean;
}

export function MessageInput({
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
  isWhatsAppConversation = false
}: MessageInputProps) {
  const { toast } = useToast();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim()) return;

    try {
      handleSendMessage();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message || "An error occurred while sending the message"
      });
    }
  };

  return (
    <div className="border-t p-4">
      <form onSubmit={onSubmit} className="relative flex items-center">
        <Input
          type="text"
          placeholder={isWhatsAppConversation ? "Type your WhatsApp message here..." : "Type your message here..."}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="rounded-full py-2 pr-12"
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          className={`absolute right-2 rounded-full ${isWhatsAppConversation ? 'bg-green-600 hover:bg-green-700' : ''}`}
          disabled={sendMessageMutation.isPending || !newMessage.trim()}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
        {isWhatsAppConversation && (
          <div className="absolute -bottom-6 right-2 text-xs text-green-600">
            WhatsApp conversation
          </div>
        )}
      </form>
    </div>
  );
}
