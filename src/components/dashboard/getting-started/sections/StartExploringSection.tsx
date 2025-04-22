
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, RadioTower, List } from "lucide-react";

const features = [
  {
    title: "Create a Keyword Reply",
    description: "Automate responses based on keywords",
    icon: MessageSquare,
  },
  {
    title: "Setup an Offline Bot",
    description: "Automatic responses when you are away",
    icon: Clock,
  },
  {
    title: "Send a Broadcast",
    description: "Send a message to multiple contacts",
    icon: RadioTower,
  },
  {
    title: "Create a Chatbot",
    description: "Automate responses based on keywords",
    icon: MessageSquare,
  }
];

export function StartExploringSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Exploring</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div key={feature.title} className="p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-4 mb-4">
                <feature.icon className="h-6 w-6" />
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
              <Button variant="secondary" className="w-full">
                Create Now!
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
