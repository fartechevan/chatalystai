
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Facebook, Instagram, Mail, Phone } from "lucide-react";

const channels = [
  {
    title: "WhatsApp Business & Personal",
    subtitle: "QR Integration",
    icon: MessageSquare,
    action: "Connect Now!",
    variant: "whatsapp"
  },
  {
    title: "WhatsApp Business API (WABA)",
    subtitle: "Meta Partner",
    icon: MessageSquare,
    action: "Connect Now or Migrate Existing!",
    variant: "whatsapp"
  },
  {
    title: "Instagram",
    subtitle: "",
    icon: Instagram,
    action: "Connect Now!",
    variant: "instagram"
  },
  {
    title: "FB Messenger",
    subtitle: "",
    icon: Facebook,
    action: "Connect Now!",
    variant: "messenger"
  },
  {
    title: "Calling",
    subtitle: "",
    icon: Phone,
    action: "Connect Now!",
    variant: "default"
  },
  {
    title: "E-mail",
    subtitle: "",
    icon: Mail,
    action: "Coming Soon",
    variant: "email",
    disabled: true
  }
];

export function ChannelSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <div key={channel.title} className="p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-4 mb-4">
                <channel.icon className="h-6 w-6" />
                <div>
                  <h3 className="font-medium">{channel.title}</h3>
                  {channel.subtitle && (
                    <p className="text-sm text-muted-foreground">{channel.subtitle}</p>
                  )}
                </div>
              </div>
              <Button 
                variant="secondary" 
                className="w-full"
                disabled={channel.disabled}
              >
                {channel.action}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
