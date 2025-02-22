
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Chat {
  id: string;
  name: string;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface InstanceInfo {
  instanceId: string;
  owner: string;
  profileName: string;
  profilePictureUrl: string;
  phoneNumber: string;
  state: string;
}

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  instanceInfo?: InstanceInfo;
}

export function ChatSidebar({ chats, selectedChatId, onChatSelect, instanceInfo }: ChatSidebarProps) {
  return (
    <div className="p-4 space-y-4">
      {instanceInfo && (
        <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
          <Avatar>
            <AvatarFallback>
              {instanceInfo.profileName?.[0] || instanceInfo.phoneNumber?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{instanceInfo.profileName}</h3>
            <p className="text-sm text-muted-foreground">{instanceInfo.phoneNumber}</p>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {chats.map((chat) => (
          <Button
            key={chat.id}
            variant={selectedChatId === chat.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onChatSelect(chat.id)}
          >
            <div className="flex items-center space-x-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{chat.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{chat.name}</p>
                {chat.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.lastMessage.content}
                  </p>
                )}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
