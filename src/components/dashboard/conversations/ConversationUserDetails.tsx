import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Phone, Video, Mail } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Conversation } from "./types";
import { fetchLeadById } from "./api/conversationsApi";
import { Lead } from "./types";
import { getCustomerName, getCustomerEmail, getFirstInitial } from "./utils/participantUtils";

interface ConversationUserDetailsProps {
  conversation: Conversation | null;
}

export function ConversationUserDetails({ conversation }: ConversationUserDetailsProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>Details</SheetTitle>
          <SheetDescription>
            No conversation selected. Please select a conversation to view
            details.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    );
  }

  return (
    <SheetContent side="right" className="w-96">
      <SheetHeader>
        <SheetTitle>Details</SheetTitle>
        <SheetDescription>
          Information about the selected conversation and its participants.
        </SheetDescription>
      </SheetHeader>

      <div className="py-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{getFirstInitial(conversation)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">{getCustomerName(conversation)}</h4>
            <p className="text-sm text-muted-foreground">
              {getCustomerEmail(conversation)}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Phone className="mr-2 h-4 w-4" />
            Call
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Video className="mr-2 h-4 w-4" />
            Video Call
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        </div>
      </div>

      <div className="border-t py-4">
        <h5 className="mb-4 text-sm font-semibold">Conversation Info</h5>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground">
              Created At:
            </span>
            <span className="text-xs">
              {conversation.created_at
                ? new Date(conversation.created_at).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground">
              Conversation ID:
            </span>
            <span className="text-xs">{conversation.conversation_id}</span>
          </div>
          {lead && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-muted-foreground">
                Lead ID:
              </span>
              <span className="text-xs">{lead.id}</span>
            </div>
          )}
        </div>
      </div>
    </SheetContent>
  );
}
