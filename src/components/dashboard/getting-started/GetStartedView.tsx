
import { Card, CardContent } from "@/components/ui/card";
import { ChannelSection } from "./sections/ChannelSection";
import { OnboardingSection } from "./sections/OnboardingSection";
import { StartExploringSection } from "./sections/StartExploringSection";
// Removed AnalyticsPreview import
import { User } from "@supabase/supabase-js";
import { useIntegrationsCount } from "@/hooks/useIntegrationsCount";
import { useCustomerCount } from "@/hooks/useCustomerCount";

interface GetStartedViewProps {
  userData: User | undefined | null;
}

export function GetStartedView({ userData }: GetStartedViewProps) {
  const { integrationsCount } = useIntegrationsCount();
  const { customerCount } = useCustomerCount();
  
  const stats = {
    credits: 10000
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Hello, {userData?.email?.split('@')[0] || 'User'}!</h1>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{integrationsCount} Channels</span>
            <span>•</span>
            <span>{customerCount} Contacts</span>
            <span>•</span>
            <span>{stats.credits} Credits</span>
          </div>
        </CardContent>
      </Card>

      <OnboardingSection />
      <ChannelSection />
      <StartExploringSection />
      {/* Removed AnalyticsPreview component */}
    </div>
  );
}
