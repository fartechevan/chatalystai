import React, { useState } from 'react'; // Import useState
import { AnalyzedConversation, Message } from './ConversationStatsView'; // Import Message type too
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from 'date-fns'; // Import parseISO
import { Card, CardContent } from "@/components/ui/card"; // Import Card components for messages

interface SelectedConversationsListProps {
  conversations: AnalyzedConversation[];
}

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
    <ScrollArea className="h-[600px] w-full rounded-md border p-4"> {/* Increased height */}
      {conversations.map((conv, index) => (
        <React.Fragment key={conv.conversation_id}>
          {/* Make the summary div clickable */}
          <div
            className="text-sm mb-2 p-2 rounded hover:bg-muted cursor-pointer"
            onClick={() => handleConversationClick(conv.conversation_id)}
          >
            <p className="font-medium">
              ID: <span className="font-normal text-muted-foreground">{conv.conversation_id.substring(0, 8)}...</span> {/* Shorten ID */}
            </p>
            <p className="font-medium">
              Date: <span className="font-normal text-muted-foreground">{formatMessageTime(conv.created_at)}</span>
            </p>
            {conv.sentimentResult?.description && (
               <p className="font-medium">
                 Reason: <span className="font-normal text-muted-foreground italic">"{conv.sentimentResult.description}"</span>
               </p>
            )}
          </div>

          {/* Conditionally render full conversation messages */}
          {selectedConversationId === conv.conversation_id && (
            <Card className="my-2 bg-muted/50">
              <CardContent className="p-3">
                <ScrollArea className="h-[300px] w-full pr-3"> {/* Inner scroll for messages */}
                  {conv.messages && conv.messages.length > 0 ? (
                    conv.messages.map((msg, msgIndex) => (
                      <div key={msgIndex} className="text-xs mb-2 pb-2 border-b border-border/50 last:border-b-0">
                        <p className={`font-semibold ${msg.sender_participant_id ? 'text-blue-600' : 'text-green-600'}`}>
                           {/* Basic sender differentiation - needs improvement if participant roles are available */}
                           {msg.sender_participant_id ? 'User' : 'Assistant'}
                           <span className="text-muted-foreground font-normal ml-2">({formatMessageTime(msg.created_at)})</span>
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content || '[No Content]'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No messages found for this conversation.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {index < conversations.length - 1 && <Separator className="my-2" />}
        </React.Fragment>
      ))}
    </ScrollArea>
  );
}
