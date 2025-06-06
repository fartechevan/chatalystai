
import { Card, CardContent } from "@/components/ui/card";
import { ChannelSection } from "./sections/ChannelSection";
import { OnboardingSection } from "./sections/OnboardingSection";
import { StartExploringSection } from "./sections/StartExploringSection";
// Removed AnalyticsPreview import
import { User } from "@supabase/supabase-js";
import { useIntegrationsCount } from "@/hooks/useIntegrationsCount";
import { useCustomerCount } from "@/hooks/useCustomerCount";
import { useDashboardData } from "@/hooks/useDashboardData"; // Added
import { Skeleton } from "@/components/ui/skeleton"; // Added for loading state

interface GetStartedViewProps {
  userData: User | undefined | null;
}

export function GetStartedView({ userData }: GetStartedViewProps) {
  const { integrationsCount, isLoading: isLoadingIntegrations } = useIntegrationsCount();
  const { customerCount, isLoading: isLoadingCustomers } = useCustomerCount();
  
  // Fetch dashboard data for plan, messages, tokens
  // The 'all' for userFilter is fine as useDashboardData uses authUser.id for these specific stats
  const { 
    isLoading: isLoadingDashboardData, 
    messages, 
    subscriptionPlan, 
    tokenUsage, 
    planLimits 
  } = useDashboardData('month', 'all');

  const overallIsLoading = isLoadingIntegrations || isLoadingCustomers || isLoadingDashboardData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Hello, {userData?.email?.split('@')[0] || 'User'}!</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {isLoadingIntegrations ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span>{integrationsCount} Channels</span>
            )}
            <span>•</span>
            {isLoadingCustomers ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span>{customerCount} Contacts</span>
            )}
            
            {isLoadingDashboardData ? (
              <>
                <span>•</span><Skeleton className="h-4 w-24" /> 
                <span>•</span><Skeleton className="h-4 w-28" />
                <span>•</span><Skeleton className="h-4 w-28" />
              </>
            ) : subscriptionPlan?.plans?.name ? (
              <>
                <span>•</span>
                <span>Plan: {subscriptionPlan.plans.name}</span>
                <span>•</span>
                <span>
                  Messages: {messages.length} / {planLimits.messagesPerMonth ?? '∞'}
                </span>
                <span>•</span>
                <span>
                  Tokens: {tokenUsage} / {planLimits.tokenAllocation ?? '∞'}
                </span>
              </>
            ) : !isLoadingDashboardData ? ( // Only show if not loading and no plan
              <>
                <span>•</span>
                <span>Plan info not available</span>
              </>
            ) : null}
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
