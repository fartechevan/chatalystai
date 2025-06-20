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
  planMessageUsage?: { messages_sent_this_cycle: number } | null; // Added new prop
}

export function MessagesSection({
  className = "",
  messages = [],
  timeFilter = 'month',
  planMessageUsage = null, // Added default for new prop
}: MessagesSectionProps) {
  const displayMessageCount = planMessageUsage?.messages_sent_this_cycle ?? messages.length;
  const descriptionText = planMessageUsage
    ? "MESSAGES SENT THIS BILLING CYCLE"
    : "INCOMING WHATSAPP WEB MESSAGES";
  const subDescriptionText = planMessageUsage
    ? "Current billing cycle"
    : `in the selected period (${timeFilter})`;

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">
          {descriptionText}
        </CardDescription>
        <CardTitle className="text-4xl font-bold text-primary">
          {displayMessageCount}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-xs text-muted-foreground">
          <span>{subDescriptionText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
