import { Search, Edit, MessagesSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Added AvatarImage
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge"; // Badge not used in new structure
import { Separator } from "@/components/ui/separator"; // Added Separator
import type { Conversation } from "./types";
import { useState, useMemo } from "react"; // Removed useEffect, supabase
// import { supabase } from "@/integrations/supabase/client"; // Not used directly here anymore
import type { Customer } from "./types/customer";
import { BroadcastModal } from "./BroadcastModal"; // Assuming this is still needed for the Edit button's action
import { cn } from "@/lib/utils";
import { filterConversations } from "./utils/conversationProcessing";

interface ConversationLeftPanelProps {
  conversations: Conversation[];
  customersData: Record<string, Customer> | null;
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
  onConversationSelect?: () => void;
}

export function ConversationLeftPanel({
  conversations,
  customersData,
  selectedConversation,
  setSelectedConversation,
  onConversationSelect,
}: ConversationLeftPanelProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false); // Retained for Edit button action

  const locallyFilteredConversations = useMemo(() => {
    return filterConversations(conversations, customersData, internalSearchQuery);
  }, [conversations, customersData, internalSearchQuery]);

  // Helper to get a placeholder image URL, replace with actual logic if available
  const getAvatarImage = (conv: Conversation): string | undefined => {
    // Example: try to find a customer and use a placeholder based on their ID or name
    // This is a placeholder, actual image URLs would come from your data
    // const customerId = conv.participants?.find(p => p.customer_id)?.customer_id;
    // if (customerId && customersData && customersData[customerId]?.avatar_url) { // avatar_url does not exist on Customer type
    //     return customersData[customerId]?.avatar_url;
    // }
    // Fallback placeholder, e.g., based on a hash of the name or ID
    // For now, returning undefined to let AvatarFallback work
    return undefined;
  };

  const getAvatarInitial = (conversation: Conversation) => {
    const displayName = getConversationName(conversation);
    return displayName ? displayName.charAt(0).toUpperCase() : "U";
  };

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.customer_name && conversation.customer_name.trim() !== '') {
      return conversation.customer_name;
    }
    if (conversation.participants && conversation.participants.length > 0) {
      const memberParticipant = conversation.participants.find(p => p.role === 'member');
      if (memberParticipant && memberParticipant.external_user_identifier) {
        return memberParticipant.external_user_identifier;
      }
    }
    return 'Unknown Contact';
  };

  // Placeholder for last message - replace with actual data if available
  const getLastMessagePreview = (conv: Conversation): string => {
    // Attempt to get the latest message from the conversation object itself.
    // This assumes 'messages' on the Conversation object in the list might contain
    // the latest message, or that the backend provides a snippet.
    if (conv.messages && conv.messages.length > 0) {
      // Assuming messages are sorted with the latest first, or only the latest is provided.
      // If not, logic to find the actual latest message would be needed here.
      const latestMessage = conv.messages[0]; // Or conv.messages[conv.messages.length - 1] if sorted ascending
      
      let prefix = "";
      // Check sender role to add "You: " prefix.
      // Assuming 'admin' or a specific user ID represents "You".
      // This might need adjustment based on how your system identifies the current user.
      if (latestMessage.sender?.role === 'admin') { // Or check against current user's ID if available
        prefix = "You: ";
      }
      return `${prefix}${latestMessage.content}`;
    }
    return ""; // Fallback to empty string if no message snippet is available
  }

  return (
    <div className={cn("bg-background flex flex-col h-full overflow-hidden", 
                        "sm:w-56 lg:w-72 2xl:w-80" // Widths from user HTML, applied here if not by parent
                      )}>
      {/* Header Section with consistent padding */}
      <div className="bg-background sticky top-0 z-10 px-2 pt-3 pb-3 shadow-sm border-b space-y-3"> {/* Changed px-4 to px-2 */}
        <div className="flex items-center justify-between"> 
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">Inbox</h1>
            <MessagesSquare className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <Button
            variant="ghost" // Class from user HTML: hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50
            size="icon" // Class from user HTML: size-9 rounded-lg
            className="size-9 rounded-lg"
            onClick={() => setIsBroadcastModalOpen(true)} 
            title="New Message / Edit" 
          >
            <Edit className="h-5 w-5 stroke-muted-foreground" />
          </Button>
        </div>
        {/* New Search Bar Structure */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="search"
            placeholder="Search chat..."
            className="w-full pl-10 pr-4 py-3 h-12 rounded-md border" // Increased pr-3 to pr-4
            value={internalSearchQuery}
            onChange={(e) => setInternalSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scroll Area for Conversation List */}
      <ScrollArea className="flex-1 min-h-0"> {/* Removed padding from ScrollArea itself */}
        {locallyFilteredConversations.length === 0 ? (
          <div className="pt-4 text-center text-muted-foreground p-2"> {/* Added padding to empty state */}
            <p>No conversations found.</p>
          </div>
        ) : (
          <div key="conversation-list-items" className="p-2">  {/* Added h-full */}
            {locallyFilteredConversations.map((conv, index) => (
              <>
                <button
                  key={conv.conversation_id}
                  type="button" // Explicitly set type
                  className={cn(
                    "hover:bg-secondary/75 flex w-full rounded-md px-2 py-2 text-left text-sm items-center", // Removed -mx-1, restored px-2
                    selectedConversation?.conversation_id === conv.conversation_id ? 'bg-secondary' : '' // Use secondary for selection
                  )}
                  onClick={() => {
                    setSelectedConversation(conv);
                    onConversationSelect?.();
                  }}
                >
                  <div className="flex gap-3 items-center w-full"> {/* Increased gap, items-center */}
                    <Avatar className="relative flex size-10 shrink-0 overflow-hidden rounded-full"> {/* size-10 from example */}
                      <AvatarImage 
                        src={getAvatarImage(conv)} 
                        alt={getConversationName(conv)} 
                        className="aspect-square size-full"
                      />
                      <AvatarFallback>{getAvatarInitial(conv)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0"> {/* Ensure text truncates */}
                      <span className="font-medium line-clamp-1">{getConversationName(conv)}</span>
                      <span className="text-muted-foreground line-clamp-1 text-xs sm:text-sm"> {/* Adjusted text size */}
                        {getLastMessagePreview(conv)}
                      </span>
                    </div>
                    {/* Placeholder for timestamp or unread count if needed */}
                    {/* <span className="text-xs text-muted-foreground whitespace-nowrap">
                       {new Date(conv.updated_at).toLocaleDateString()}
                     </span> */}
                  </div>
                </button>
                {index < locallyFilteredConversations.length - 1 && (
                  <Separator className="my-1" /> // Separator from user HTML
                )}
              </>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />
    </div>
  );
}
