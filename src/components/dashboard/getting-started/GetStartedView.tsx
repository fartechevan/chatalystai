
import { Card, CardContent } from "@/components/ui/card";
import { ChannelSection } from "./sections/ChannelSection";
import { OnboardingSection } from "./sections/OnboardingSection";
import { StartExploringSection } from "./sections/StartExploringSection";
import { AnalyticsPreview } from "./sections/AnalyticsPreview";

export function GetStartedView() {
  const stats = {
    channels: 2,
    contacts: 0,
    credits: 10000
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Hello, {/*user?.email?.split('@')[0] || */'User'}!</h1>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{stats.channels} Channels</span>
            <span>•</span>
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
