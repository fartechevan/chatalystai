
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import type { Integration } from "../../types";
import { WhatsAppCloudApiContent } from "./WhatsAppCloudApiContent";
import { WhatsAppAuthorizationContent } from "./WhatsAppAuthorizationContent";
import { WhatsAppBusinessSettings } from "./WhatsAppBusinessSettings";
import { WhatsAppBusinessAuthorization } from "./WhatsAppBusinessAuthorization";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IntegrationTabsProps {
  selectedIntegration: Integration | null;
  handleConnectWithFacebook: () => void;
  onClose: () => void;
  onConnect?: () => void;
}

export function IntegrationTabs({ 
  selectedIntegration, 
  handleConnectWithFacebook,
  onClose,
  onConnect
}: IntegrationTabsProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClearData = async () => {
    if (!selectedIntegration?.id) {
      toast({
        title: "Error",
        description: "No integration selected",
        variant: "destructive",
      });
      return;
    }

    setIsClearing(true);
    try {
      // 1. First, get all conversations related to this integration
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('conversation_id')
        .eq('integrations_id', selectedIntegration.id);

      if (conversationsError) {
        throw conversationsError;
      }

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.conversation_id);
        
        // 2. Delete all messages related to these conversations
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);
          
        if (messagesError) {
          throw messagesError;
        }

        // 3. Delete all participants related to these conversations
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .delete()
          .in('conversation_id', conversationIds);
          
        if (participantsError) {
          throw participantsError;
        }

        // 4. Delete all conversation summaries related to these conversations
        const { error: summariesError } = await supabase
          .from('conversation_summaries')
          .delete()
          .in('conversation_id', conversationIds);
          
        if (summariesError && summariesError.code !== 'PGRST116') { // Ignore if table doesn't exist
          throw summariesError;
        }

        // 5. Finally, delete the conversations themselves
        const { error: deleteConversationsError } = await supabase
          .from('conversations')
          .delete()
          .in('conversation_id', conversationIds);
          
        if (deleteConversationsError) {
          throw deleteConversationsError;
        }

        toast({
          title: "Success",
          description: `Cleared ${conversations.length} conversations and related data`,
        });
      } else {
        toast({
          title: "No data to clear",
          description: "No conversations found for this integration",
        });
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        title: "Error clearing data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
      </TabsList>
      
      {/* Render the content based on selected integration */}
      {selectedIntegration?.name === "WhatsApp Cloud API" ? (
        <>
          <TabsContent value="settings" className="space-y-6 h-96">
            <WhatsAppCloudApiContent handleConnectWithFacebook={handleConnectWithFacebook} />
          </TabsContent>
          
          <TabsContent value="authorization">
            <WhatsAppAuthorizationContent />
          </TabsContent>
        </>
      ) : (
        <>
          <TabsContent value="settings" className="space-y-6 h-96">
            <WhatsAppBusinessSettings 
              selectedIntegration={selectedIntegration}
              onConnect={onConnect || (() => {})}
            />
          </TabsContent>
          
          <TabsContent value="authorization" className="space-y-6 h-96">
            <WhatsAppBusinessAuthorization selectedIntegration={selectedIntegration} />
          </TabsContent>
        </>
      )}
      
      <div className="mt-6 flex justify-end gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isClearing}>
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Data
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Integration Data</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all conversations, messages, and participants related to this integration.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearData}>
                Yes, Clear Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Tabs>
  );
}
