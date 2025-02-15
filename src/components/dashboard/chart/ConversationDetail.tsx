
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables } from "@/integrations/supabase/types";

type ConversationDetailProps = {
  conversation: Tables<"conversations"> | null;
  onClose: () => void;
};

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  if (!conversation) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conversation Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-4 p-4">
            <div>
              <h3 className="font-medium">Created At</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(conversation.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="font-medium">Last Updated</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(conversation.updated_at).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="font-medium">Conversation ID</h3>
              <p className="text-sm font-mono text-muted-foreground">
                {conversation.conversation_id}
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
