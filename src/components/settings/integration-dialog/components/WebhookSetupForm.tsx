import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

interface WebhookSetupFormProps {
  integrationId: string;
  onComplete: () => void;
  defaultUrl?: string;
  defaultEvents?: string[];
}

const AVAILABLE_EVENTS = [
  "message_received",
  "message_sent",
  "instance_connected",
  "instance_disconnected",
  "contact_updated",
  "conversation_started",
  "conversation_ended",
  // Add more events as needed
];

export function WebhookSetupForm({
  integrationId,
  onComplete,
  defaultUrl = "",
  defaultEvents = [],
}: WebhookSetupFormProps) {
  const [webhookUrl, setWebhookUrl] = useState(defaultUrl);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(defaultEvents);
  const [loading, setLoading] = useState(false);

  const handleEventToggle = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl || selectedEvents.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide a webhook URL and select at least one event.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("integrations")
      .update({
        webhook_url: webhookUrl,
        webhook_events: selectedEvents,
      })
      .eq("id", integrationId);
    setLoading(false);
    if (error) {
      toast({
        title: "Failed to Save Webhook",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Webhook Saved",
        description: "Webhook URL and events have been saved.",
      });
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-md bg-muted">
      <h3 className="text-lg font-semibold">Webhook Setup</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Webhook URL</label>
        <Input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://your-webhook-endpoint.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Webhook Events</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_EVENTS.map((event) => (
            <label key={event} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedEvents.includes(event)}
                onChange={() => handleEventToggle(event)}
                className="accent-primary"
              />
              <span className="text-sm">{event}</span>
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Webhook & Continue"}
      </Button>
    </form>
  );
}
