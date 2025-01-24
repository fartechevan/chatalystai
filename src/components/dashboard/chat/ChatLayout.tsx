import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMain } from "./ChatMain";
import { ChatFiles } from "./ChatFiles";

interface ChatLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatLayout({ open, onOpenChange }: ChatLayoutProps) {
  const [activeChat, setActiveChat] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-screen p-0">
        <div className="flex h-full">
          <ChatSidebar onChatSelect={setActiveChat} />
          <ChatMain activeChat={activeChat} />
          <ChatFiles />
        </div>
      </SheetContent>
    </Sheet>
  );
}