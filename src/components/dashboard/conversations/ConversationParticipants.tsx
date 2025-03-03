
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Conversation } from "./types";
import type { ConversationParticipant } from "./types/conversation";

interface ConversationParticipantsProps {
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversationParticipants({
  conversation,
  open,
  onOpenChange
}: ConversationParticipantsProps) {
  if (!conversation || !conversation.participants) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conversation Participants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {conversation.participants.map((participant: ConversationParticipant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {participant.role === 'admin' ? 'A' : 'C'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {participant.role === 'admin' ? 'Admin' : 'Customer'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {participant.profiles?.email || 'No email'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
