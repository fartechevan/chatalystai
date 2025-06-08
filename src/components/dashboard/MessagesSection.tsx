import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

interface MessagesSectionProps {
  className?: string;
  messages?: Tables<'messages'>[]; // These will be pre-filtered WhatsApp Web messages
  timeFilter?: 'today' | 'yesterday' | 'week' | 'month';
}

export function MessagesSection({ className = "", messages = [], timeFilter = 'month' }: MessagesSectionProps) {
  const whatsappWebMessagesCount = messages.length; // Directly use the length of the passed (filtered) messages

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">
          INCOMING WHATSAPP WEB MESSAGES
        </CardDescription>
        <CardTitle className="text-4xl font-bold text-primary">
          {whatsappWebMessagesCount}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-xs text-muted-foreground">
          <span>in the selected period ({timeFilter})</span>
        </div>
      </CardContent>
    </Card>
  );
}
