
import { Conversation, Lead } from "./types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 
import { MoreHorizontal, Phone, Video, PanelRightClose, PanelLeftClose, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    async function fetchLead() {
      if (!conversation?.lead_id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', conversation.lead_id)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching lead:', error);
        } else if (data) {
          setLead(data as Lead);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLead();
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
                {lead.name} 
                <span className="text-sm text-muted-foreground">
                  (from {participant.name})
                </span>
              </>
            ) : (
              participant.name
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {lead ? lead.company_name || 'No company' : 'Customer'}
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
