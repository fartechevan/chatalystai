import { useState } from "react";
import { Loader2, Send, Plus, Paperclip, ImagePlus } from "lucide-react"; // Replaced PhotoPlus with ImagePlus
import { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
// Input component from Shadcn is not used in the new structure directly, using raw input
// import { Input } from "@/components/ui/input"; 
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  sendMessageMutation: UseMutationResult<unknown, Error, string, unknown>;
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

  // Form submission is now handled by the send button's onClick
  // const onSubmit = async (event: React.FormEvent) => { ... };

  return (
    <div className="border-t p-2 sm:p-3"> {/* Adjusted padding for the outer container */}
      <div className="border-input focus-within:ring-ring flex items-center gap-1 sm:gap-2 rounded-md border px-2 py-1 focus-within:ring-1 focus-within:outline-hidden lg:gap-3 h-12"> {/* Removed flex-1, added h-12 */}
        {/* Action Buttons */}
        <div className="flex items-center space-x-0.5 sm:space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 sm:size-9 rounded-md" 
            type="button"
            onClick={() => console.log("Plus clicked")} // Placeholder
            aria-label="Add attachment or action"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 stroke-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 sm:size-9 hidden rounded-md lg:inline-flex" 
            type="button"
            onClick={() => console.log("Photo clicked")} // Placeholder
            aria-label="Add photo"
          >
            <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5 stroke-muted-foreground" /> {/* Replaced PhotoPlus */}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 sm:size-9 hidden rounded-md lg:inline-flex" 
            type="button"
            onClick={() => console.log("Paperclip clicked")} // Placeholder
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 stroke-muted-foreground" />
          </Button>
        </div>

        {/* Text Input */}
        <label className="flex-1 h-full"> {/* Make label take full height of parent */}
          <span className="sr-only">Chat Text Box</span>
          <input
            placeholder={isWhatsAppConversation ? "Type your WhatsApp message..." : "Type your messages..."}
            className="h-full w-full bg-inherit text-sm focus-visible:outline-none placeholder:text-muted-foreground px-1 sm:px-2" // Adjusted padding
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newMessage.trim()) handleSendMessage();
              }
            }}
            disabled={sendMessageMutation.isPending}
          />
        </label>

        {/* Send Button */}
        <Button
          variant="ghost" // Using ghost to match general style, can be changed
          size="icon"
          className={cn(
            "size-8 sm:size-9 rounded-md",
            isWhatsAppConversation && "bg-green-600 hover:bg-green-700 text-white hover:text-white"
          )}
          type="button" // Changed from submit
          onClick={handleSendMessage}
          disabled={sendMessageMutation.isPending || !newMessage.trim()}
          aria-label="Send message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
