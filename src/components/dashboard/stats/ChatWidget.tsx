
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react'; // Chat icon

interface ChatWidgetProps {
  onClick: () => void; // Function to call when the widget is clicked
}

export function ChatWidget({ onClick }: ChatWidgetProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
      size="icon"
      aria-label="Open Chat"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
}
