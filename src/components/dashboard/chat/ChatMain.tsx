
import { Send, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ChatMainProps {
  activeChat: string | null;
}

export function ChatMain({ activeChat }: ChatMainProps) {
  const [newMessage, setNewMessage] = useState("");
  const [rows, setRows] = useState(1);

  const messages = [
    {
      id: "1",
      sender: "Kate Johnson",
      content: "Hi everyone, let's start the call soon 👋",
      time: "11:24 AM",
      avatar: ""
    },
    {
      id: "2",
      sender: "Kate Johnson",
      content: "Recently I saw properties in a great location that I did not pay attention to before 😊",
      time: "11:25 AM",
      avatar: ""
    },
    {
      id: "3",
      sender: "Evan Scott",
      content: "Ooo, why don't you say something more",
      time: "11:34 AM",
      avatar: ""
    }
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && activeChat) {
      e.preventDefault();
      // Handle send message
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const lineCount = e.target.value.split('\n').length;
    setRows(Math.min(lineCount, 4)); // Maximum 4 rows
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4">
        <h2 className="font-semibold">Group Chat</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{message.sender[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{message.sender}</p>
                  <span className="text-xs text-muted-foreground">{message.time}</span>
                </div>
                <div className="mt-1 rounded-lg bg-accent p-3">
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <Textarea
            placeholder="Write your message..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            value={newMessage}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            rows={rows}
          />
          <Button size="icon" variant="ghost">
            <Smile className="h-5 w-5" />
          </Button>
          <Button size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
