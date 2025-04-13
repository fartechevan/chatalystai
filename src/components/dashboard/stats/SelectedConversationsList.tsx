import React, { useState } from 'react';
import { AnalyzedConversation, Message } from './ConversationStatsView';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardHeader, CardTitle
import { Badge } from "@/components/ui/badge"; // Import Badge
import { cn } from "@/lib/utils"; // Import cn

interface SelectedConversationsListProps {
  conversations: AnalyzedConversation[];
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


export function SelectedConversationsList({ conversations }: SelectedConversationsListProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleConversationClick = (id: string) => {
    setSelectedConversationId(prevId => (prevId === id ? null : id)); // Toggle selection
  };


  if (!conversations || conversations.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">No conversations match the selected sentiment.</p>;
  }

  return (
    <ScrollArea className="h-[600px] w-full"> {/* Removed border/padding, handled by inner cards */}
      <div className="space-y-3 p-1"> {/* Add spacing between cards */}
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
      </div>
    </ScrollArea>
  );
}
