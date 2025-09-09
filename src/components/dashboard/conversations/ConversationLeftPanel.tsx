import { Search, Edit, MessagesSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Conversation } from "./types";
import { useState, useMemo, Fragment } from "react";
import type { Customer } from "./types/customer";
import { BroadcastModal } from "./BroadcastModal";
import { cn } from "@/lib/utils";
import { filterConversations } from "./utils/conversationProcessing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ConversationLeftPanelProps {
  conversations: Conversation[];
  customersData: Record<string, Customer> | null;
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
  onConversationSelect?: () => void;
  integrationsConfig: { id: string; instance_display_name: string | null }[];
  selectedIntegrationIds: string[];
  setSelectedIntegrationIds: (ids: string[]) => void;
}

export function ConversationLeftPanel({
  conversations,
  customersData,
  selectedConversation,
  setSelectedConversation,
  onConversationSelect,
  integrationsConfig,
  selectedIntegrationIds,
  setSelectedIntegrationIds,
}: ConversationLeftPanelProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const locallyFilteredConversations = useMemo(() => {
    return filterConversations(conversations, customersData, internalSearchQuery);
  }, [conversations, customersData, internalSearchQuery]);

  const getAvatarImage = (conv: Conversation): string | undefined => {
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

  const getLastMessagePreview = (conv: Conversation): string => {
    if (conv.messages && conv.messages.length > 0) {
      const latestMessage = conv.messages[0];
      let prefix = "";
      if (latestMessage.sender?.role === 'admin') {
        prefix = "You: ";
      }
      return `${prefix}${latestMessage.content}`;
    }
    return "";
  }

  return (
    <div className={cn("bg-background flex flex-col h-full overflow-hidden", 
                        "sm:w-56 lg:w-72 2xl:w-80"
                      )}>
      <div className="bg-background sticky top-0 z-10 px-2 pt-3 pb-3 shadow-sm border-b space-y-3">
        <div className="flex items-center justify-between"> 
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">Inbox</h1>
            <MessagesSquare className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg"
            onClick={() => setIsBroadcastModalOpen(true)} 
            title="New Message / Edit" 
          >
            <Edit className="h-5 w-5 stroke-muted-foreground" />
          </Button>
        </div>
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="search"
            placeholder="Search chat..."
            className="w-full pl-10 pr-4 py-3 h-12 rounded-md border"
            value={internalSearchQuery}
            onChange={(e) => setInternalSearchQuery(e.target.value)}
          />
        </div>
        <div className="px-2 pt-2">
          <Label htmlFor="integration-filter">Filter by Integration</Label>
          <Select
            value={selectedIntegrationIds[0] || "all"}
            onValueChange={(value) => {
              setSelectedIntegrationIds(value === "all" ? [] : [value]);
            }}
          >
            <SelectTrigger id="integration-filter" className="w-full">
              <SelectValue placeholder="Select an integration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Integrations</SelectItem>
              {integrationsConfig.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.instance_display_name || "Unnamed Instance"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {locallyFilteredConversations.length === 0 ? (
          <div className="pt-4 text-center text-muted-foreground p-2">
            <p>No conversations found.</p>
          </div>
        ) : (
          <div key="conversation-list-items" className="p-2">
            {locallyFilteredConversations.map((conv, index) => (
              <Fragment key={`conv-fragment-${conv.conversation_id}`}>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-secondary/75 flex w-full rounded-md px-2 py-2 text-left text-sm items-center",
                    selectedConversation?.conversation_id === conv.conversation_id ? 'bg-secondary' : ''
                  )}
                  onClick={() => {
                    setSelectedConversation(conv);
                    onConversationSelect?.();
                  }}
                >
                  <div className="flex gap-3 items-center w-full">
                    <Avatar className="relative flex size-10 shrink-0 overflow-hidden rounded-full">
                      <AvatarImage 
                        src={getAvatarImage(conv)} 
                        alt={getConversationName(conv)} 
                        className="aspect-square size-full"
                      />
                      <AvatarFallback>{getAvatarInitial(conv)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium line-clamp-1">{getConversationName(conv)}</span>
                      <span className="text-muted-foreground line-clamp-1 text-xs sm:text-sm">
                        {getLastMessagePreview(conv)}
                      </span>
                    </div>
                  </div>
                </button>
                {index < locallyFilteredConversations.length - 1 && (
                  <Separator className="my-1" />
                )}
              </Fragment>
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
