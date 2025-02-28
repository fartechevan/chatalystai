
import { Conversation, Lead } from "./types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 
import { MoreHorizontal, Phone, Video, PanelRightClose, PanelLeftClose, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { fetchLeadById } from "./api/conversationsApi";

interface ConversationHeaderProps {
  conversation: Conversation | null;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  isParticipantsOpen: boolean;
  onToggleParticipants: () => void;
}

export function ConversationHeader({
  conversation,
  isDetailsOpen,
  onToggleDetails,
  isParticipantsOpen,
  onToggleParticipants
}: ConversationHeaderProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to format the lead ID without any prefix
  const getFormattedLeadId = (id?: string | null) => {
    if (!id) return '163674';
    // Just return the ID or its first 6 characters if it's long
    return id.length > 6 ? id.slice(0, 6) : id;
  };

  useEffect(() => {
    async function loadLead() {
      // Reset lead when conversation changes
      setLead(null);
      
      if (!conversation) return;
      
      // If conversation has a lead already loaded, use it
      if (conversation.lead) {
        setLead(conversation.lead);
        return;
      }
      
      // If conversation has a lead_id, fetch the lead
      if (conversation.lead_id) {
        setIsLoading(true);
        try {
          const leadData = await fetchLeadById(conversation.lead_id);
          if (leadData) {
            setLead(leadData);
          }
        } catch (error) {
          console.error('Error loading lead:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadLead();
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="h-16 border-b flex items-center px-4">
        <div className="font-medium">Select a conversation</div>
      </div>
    );
  }

  const participant = conversation.sender_type === 'customer' 
    ? conversation.sender 
    : conversation.receiver;

  return (
    <div className="h-16 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{participant.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium flex items-center gap-2">
            {lead ? (
              <>
                Lead #{getFormattedLeadId(lead.id)}
                <span className="text-sm text-muted-foreground">
                  (from {participant.name})
                </span>
              </>
            ) : (
              isLoading ? 'Loading lead...' : participant.name
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {lead 
              ? lead.company_name || 'No company' 
              : participant.email || 'Customer'
            }
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleParticipants}>
          <Users className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleDetails}>
          {isDetailsOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
