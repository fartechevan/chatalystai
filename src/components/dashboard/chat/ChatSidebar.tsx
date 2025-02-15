
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSidebarProps {
  onChatSelect: (chatId: string) => void;
}

export function ChatSidebar({ onChatSelect }: ChatSidebarProps) {
  const chats = [
    {
      id: "1",
      name: "Real estate deals",
      lastMessage: "typing...",
      time: "11:15",
      avatar: "/lovable-uploads/34c03b61-85fe-40d9-bc3e-0d4c54edc0a5.png"
    },
    {
      id: "2",
      name: "Kate Johnson",
      lastMessage: "I will send the document s...",
      time: "11:15",
      avatar: ""
    },
    {
      id: "3",
      name: "Tamara Shevchenko",
      lastMessage: "are you going to a busine...",
      time: "10:05",
      avatar: ""
    }
  ];

  return (
    <div className="flex-1 border-r bg-background">
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>J</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Jontray Arnold</p>
            <p className="text-xs text-muted-foreground">available</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search" className="pl-8" />
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className="w-full text-left p-3 rounded-lg hover:bg-accent flex items-center space-x-4"
              onClick={() => onChatSelect(chat.id)}
            >
              <Avatar className="h-10 w-10">
              <AvatarFallback>N</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium">{chat.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {chat.lastMessage}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{chat.time}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
