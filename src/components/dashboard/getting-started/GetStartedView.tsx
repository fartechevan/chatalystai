
import { Card, CardContent } from "@/components/ui/card";
import { ChannelSection } from "./sections/ChannelSection";
import { OnboardingSection } from "./sections/OnboardingSection";
import { StartExploringSection } from "./sections/StartExploringSection";
import { AnalyticsPreview } from "./sections/AnalyticsPreview";
import { User } from "@supabase/supabase-js"; // Import User type

// Define props interface
interface GetStartedViewProps {
  userData: User | undefined | null;
  integrationsCount: number; // Add the new prop
}

export function GetStartedView({ userData, integrationsCount }: GetStartedViewProps) { // Destructure props
  // Remove the hardcoded stats object or just the channels part
  const stats = {
    // channels: 2, // Remove or comment out hardcoded value
    contacts: 0, // Keep other stats if needed, or remove the object entirely if only channels is used here
    credits: 10000
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Hello, {userData?.email?.split('@')[0] || 'User'}!</h1>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {/* Use the integrationsCount prop */}
            <span>{integrationsCount} Channels</span>
            <span>•</span>
            {/* Use stats.contacts if keeping the stats object, otherwise use a default or fetch it */}
            <span>{stats.contacts} Contacts</span>
            <span>•</span>
            <span>{stats.credits} Credits</span>
          </div>
        </CardContent>
      </Card>

      <OnboardingSection />
      <ChannelSection />
      <StartExploringSection />
      <AnalyticsPreview />
    </div>
  );
}
