import React, { useState } from 'react';
import { AnalyzedConversation, Message } from './ConversationStatsView';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardHeader, CardTitle
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Button } from "@/components/ui/button"; // Import Button
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { useAuthUser } from "@/hooks/useAuthUser"; // Import useAuthUser hook
import { toast } from "@/hooks/use-toast"; // Import toast
import { CreateSegmentDialog } from "./CreateSegmentDialog"; // Import the dialog
import { cn } from "@/lib/utils"; // Import cn

interface SelectedConversationsListProps {
  conversations: AnalyzedConversation[];
  selectedSentiment: 'good' | 'moderate' | 'bad' | 'unknown' | null; // Add the new prop
}

// Helper function to get sentiment color
const getSentimentColor = (sentiment: 'good' | 'moderate' | 'bad' | 'unknown' | null): string => {
  switch (sentiment) {
    case 'good': return 'bg-green-100 text-green-800 border-green-300';
    case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'bad': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Helper to format message timestamp
const formatMessageTime = (timestamp: string) => {
  try {
    return format(parseISO(timestamp), 'Pp'); // Format like "Sep 17, 2023, 10:00:00 AM"
  } catch (e) {
    console.error("Error parsing date:", timestamp, e);
    return "Invalid Date";
  }
};


export function SelectedConversationsList({ conversations, selectedSentiment }: SelectedConversationsListProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isCreateSegmentDialogOpen, setIsCreateSegmentDialogOpen] = useState(false);
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);
  const { userData: user, isLoading: isLoadingUser } = useAuthUser(); // Correctly destructure and get user

  const handleConversationClick = (id: string) => {
    setSelectedConversationId(prevId => (prevId === id ? null : id)); // Toggle selection
  };

  const getUniqueCustomerIds = (): string[] => {
    const customerIds = new Set<string>();
    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.is_user && msg.customer_id) { // Check for customer_id
          customerIds.add(msg.customer_id);
        }
      });
    });
    return Array.from(customerIds);
  };

  const handleCreateSegmentSubmit = async (segmentName: string) => {
    if (!user) { // user is from useAuthUser()
      toast({ title: "Authentication Error", description: "You must be logged in to create a segment.", variant: "destructive" });
      return;
    }

    const customerIds = getUniqueCustomerIds();
    if (customerIds.length === 0) {
      toast({ title: "No Participants", description: "No customer participants found in the current list to create a segment from.", variant: "default" }); // Changed variant
      return;
    }

    setIsCreatingSegment(true);
    try {
      // The segment-handler expects POST to /segments/from-contacts
      // or direct POST to /segment-handler with specific body for 'from-contacts'
      // We will use the direct POST to base path approach as identified in segment-handler
      const { data, error } = await supabase.functions.invoke('segment-handler', {
        body: {
          segmentName: segmentName,
          customerIds: customerIds,
          userId: user.id, // Pass the authenticated user's ID
        },
        // method: 'POST', // Not strictly needed if the function handles POST on base path for this action
      });

      if (error) throw error;

      toast({ title: "Segment Created", description: `Segment "${segmentName}" created successfully with ${customerIds.length} participants. Segment ID: ${data?.id}` });
      setIsCreateSegmentDialogOpen(false);
    } catch (error) { // More general error typing, can be refined if specific error types are known
      console.error("Error creating segment:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Segment Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsCreatingSegment(false);
    }
  };

  const uniqueCustomerIdsCount = getUniqueCustomerIds().length;

  // Debugging logs
  console.log("[SelectedConversationsList] Rendering. Props:", { conversationsLength: conversations.length, selectedSentiment });
  console.log("[SelectedConversationsList] State:", { uniqueCustomerIdsCount, isLoadingUser, isCreatingSegment });
  console.log("[SelectedConversationsList] Button visibility conditions:", {
    cond1_selectedSentiment: !!selectedSentiment,
    cond2_conversationsLength: conversations.length > 0,
    cond3_uniqueCustomerIdsCount: uniqueCustomerIdsCount > 0,
    cond4_notIsLoadingUser: !isLoadingUser,
  });


  if (!conversations || conversations.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">No conversations match the selected sentiment.</p>;
  }

  // Capitalize first letter helper
  const capitalize = (s: string | null | undefined) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 pb-2 flex justify-between items-center">
          {selectedSentiment && (
            <h3 className="text-lg font-semibold capitalize">
              {capitalize(selectedSentiment)} Sentiment Conversations
            </h3>
          )}
          {conversations.length > 0 && uniqueCustomerIdsCount > 0 && !isLoadingUser && (
            <Button 
              size="sm" 
              onClick={() => setIsCreateSegmentDialogOpen(true)} 
              disabled={isCreatingSegment || isLoadingUser}
            >
              {isCreatingSegment ? "Creating..." : `Create Segment (${uniqueCustomerIdsCount} Participants)`}
            </Button>
          )}
        </div>
        <ScrollArea className="flex-grow w-full"> {/* Removed fixed height, let it grow */}
          <div className="space-y-3 p-4 pt-2"> {/* Adjusted padding */}
            {conversations.length === 0 && ( // This condition might be redundant due to the check above
               <p className="text-sm text-muted-foreground text-center pt-10">No conversations found for this batch.</p>
             )}
            {conversations.map((conv) => (
              <Card
            key={conv.conversation_id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleConversationClick(conv.conversation_id)}
          >
            <CardHeader className="p-3">
              <CardTitle className="text-sm font-medium flex justify-between items-center">
                <span>ID: {conv.conversation_id.substring(0, 8)}...</span>
                <Badge variant="outline" className={cn("text-xs capitalize", getSentimentColor(conv.sentimentResult?.sentiment))}>
                  {conv.sentimentResult?.sentiment || 'Unknown'}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground pt-1">
                {formatMessageTime(conv.created_at)}
              </p>
            </CardHeader>
            {/* Only show content if description exists */}
            {conv.sentimentResult?.description && (
              <CardContent className="p-3 pt-0">
                 <p className="text-xs text-muted-foreground italic">
                   Reason: "{conv.sentimentResult.description}"
                 </p>
              </CardContent>
            )}

            {/* Conditionally render full conversation messages in bubble format */}
            {selectedConversationId === conv.conversation_id && (
              <CardContent className="p-3 border-t bg-slate-50 dark:bg-slate-900/50">
                <ScrollArea className="h-[350px] w-full pr-2">
                  <div className="space-y-3">
                    {conv.messages && conv.messages.length > 0 ? (
                      conv.messages.map((msg, msgIndex) => {
                        // Use the is_user flag fetched in ConversationStatsView
                        const isUser = msg.is_user === true;
                        return (
                          <div
                            key={msgIndex}
                            className={cn(
                              "flex flex-col",
                              isUser ? "items-end" : "items-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                                isUser
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{msg.content || '[No Content]'}</p>
                            </div>
                             <p className="text-[10px] text-muted-foreground mt-1">
                                {formatMessageTime(msg.created_at)}
                             </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No messages found.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
          ))}
          {/* Removed extra closing bracket and parenthesis below */}
          </div>
        </ScrollArea>
      </div>
      <CreateSegmentDialog
        isOpen={isCreateSegmentDialogOpen}
        onOpenChange={setIsCreateSegmentDialogOpen}
        onSubmit={handleCreateSegmentSubmit}
        isLoading={isCreatingSegment}
      />
    </>
  );
}
