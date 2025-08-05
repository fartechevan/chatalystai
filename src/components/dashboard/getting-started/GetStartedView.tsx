
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GetStartedViewProps {
  userData: User | undefined | null;
}

export function GetStartedView({ userData }: GetStartedViewProps) {
  const { integrationsCount, isLoading: isLoadingIntegrations } = useIntegrationsCount();
  const { customerCount, isLoading: isLoadingCustomers } = useCustomerCount();
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (userData) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userData.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfileName(data.name);
        }
      }
    };

    fetchProfile();
  }, [userData]);
  
  // Fetch dashboard data for plan, messages, tokens
  // The 'all' for userFilter is fine as useDashboardData uses authUser.id for these specific stats
  const { 
    isLoading: isLoadingDashboardData, 
    messages, 
    subscriptionPlan, 
    planMessageUsage, // Added planMessageUsage
    // tokenUsage, 
    planLimits 
  } = useDashboardData('month', 'all');

  const overallIsLoading = isLoadingIntegrations || isLoadingCustomers || isLoadingDashboardData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-white">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Hello, {profileName || userData?.email?.split('@')[0] || 'User'}!</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {isLoadingIntegrations || isLoadingDashboardData ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span>Channels: {integrationsCount} / {planLimits.integrationsAllowed ?? '∞'}</span>
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
                  Messages: {planMessageUsage?.messages_sent_this_cycle ?? 0} / {planLimits.messagesPerMonth ?? '∞'}
                </span>
                {/* Tokens display temporarily removed due to issues with tokenUsage data */}
                {/* <span>•</span>
                <span>
                  Tokens: {tokenUsage} / {planLimits.tokenAllocation ?? '∞'}
                </span> */}
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
