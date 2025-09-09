
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, RadioTower, UserPlus, CheckCircle } from "lucide-react";
import { useStartExploringCounts } from "@/hooks/useStartExploringCounts";
import { Skeleton } from "@/components/ui/skeleton";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  path?: string;
  isAvailable: boolean;
}

const features: Feature[] = [
  {
    title: "Send a Broadcast",
    description: "Send a message to multiple contacts",
    icon: RadioTower,
    path: "/dashboard/broadcasts", // Corrected path
    isAvailable: true,
  },
  {
    title: "Create AI Agent",
    description: "Build and deploy intelligent AI agents",
    icon: MessageSquare, // Using MessageSquare as a placeholder icon
    path: "/dashboard/ai-agents", // Assuming this path
    isAvailable: true,
  },
  {
    title: "Invite Team Member",
    description: "Add new members to your team",
    icon: UserPlus,
    path: "/dashboard/settings/users", // Path to user settings/invitations
    isAvailable: true,
  },
];

export function StartExploringSection() {
  const navigate = useNavigate();
  const { broadcastsCount, aiAgentsCount, profilesCount, isLoading, error, thresholds } = useStartExploringCounts();

  // Filter features based on completion status
  const getAvailableFeatures = () => {
    const availableFeatures = [];
    
    // Show "Send a Broadcast" if user has less than threshold broadcasts
    if (broadcastsCount < thresholds.broadcasts) {
      availableFeatures.push(features[0]); // Send a Broadcast
    }
    
    // Show "Create AI Agent" if user has less than threshold AI agents
    if (aiAgentsCount < thresholds.aiAgents) {
      availableFeatures.push(features[1]); // Create AI Agent
    }
    
    // Show "Invite Team Member" if user has less than threshold team members
    if (profilesCount < thresholds.teamMembers) {
      availableFeatures.push(features[2]); // Invite Team Member
    }
    
    return availableFeatures;
  };

  const availableFeatures = getAvailableFeatures();
  const allTasksCompleted = broadcastsCount >= thresholds.broadcasts && aiAgentsCount >= thresholds.aiAgents && profilesCount >= thresholds.teamMembers;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Exploring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start gap-4 mb-4">
                  <Skeleton className="h-6 w-6" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Exploring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Error loading data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (allTasksCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Exploring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Congratulations!</h3>
            <p className="text-muted-foreground mb-4">
              You've completed all the getting started tasks. You're ready to explore all the features!
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
              <span>✓ {thresholds.broadcasts}+ Broadcasts sent</span>
              <span>•</span>
              <span>✓ {thresholds.aiAgents}+ AI Agents created</span>
              <span>•</span>
              <span>✓ {thresholds.teamMembers}+ Team members invited</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Exploring</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableFeatures.map((feature) => (
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
