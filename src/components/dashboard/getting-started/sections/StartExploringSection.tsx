
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, RadioTower } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  path?: string;
  isAvailable: boolean;
}

const features: Feature[] = [
  {
    title: "Create a Keyword Reply",
    description: "Automate responses based on keywords",
    icon: MessageSquare,
    isAvailable: false,
  },
  {
    title: "Setup an Offline Bot",
    description: "Automatic responses when you are away",
    icon: Clock,
    isAvailable: false,
  },
  {
    title: "Send a Broadcast",
    description: "Send a message to multiple contacts",
    icon: RadioTower,
    path: "/dashboard/broadcasts", // Corrected path
    isAvailable: true,
  },
  {
    title: "Create a Chatbot",
    description: "Automate responses based on keywords",
    icon: MessageSquare,
    isAvailable: false,
  },
];

export function StartExploringSection() {
  const navigate = useNavigate();

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
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => feature.isAvailable && feature.path && navigate(feature.path)}
                disabled={!feature.isAvailable}
              >
                {feature.isAvailable ? "Create Now!" : "Coming Soon"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
