
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEvolutionAPI } from "@/hooks/useEvolutionAPI";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMain } from "./ChatMain";
import { useState } from "react";

export function ChatLayout() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string>("your-instance-id"); // Replace with your actual instance ID
  
  const {
    instanceInfo,
    chats,
    useMessages,
    sendMessage,
    isConfigured
  } = useEvolutionAPI(instanceId);

  const { data: messages } = useMessages(selectedChatId);

  const handleSendMessage = async (message: string) => {
    if (!selectedChatId) return;
    
    try {
      await sendMessage.mutateAsync({
        chatId: selectedChatId,
        message: message
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-80 border-r">
        <ScrollArea className="h-screen">
          <ChatSidebar
            chats={chats || []}
            selectedChatId={selectedChatId}
            onChatSelect={setSelectedChatId}
            instanceInfo={instanceInfo?.instance}
          />
        </ScrollArea>
      </div>
      <div className="flex-1">
        <ChatMain
          selectedChat={chats?.find(chat => chat.id === selectedChatId)}
          messages={messages || []}
          onSendMessage={handleSendMessage}
          isLoading={!isConfigured}
        />
      </div>
    </div>
  );
}
