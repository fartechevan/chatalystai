import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from 'react'; // Import React
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Json, Database } from "@/types/supabase"; // Import Json and Database types
// TODO: Import DataTable and columns if needed for monthly bills

// interface TokenUsageData {
//   tokens_used: number;
//   created_at: string;
// }

// TODO: Define interface for monthly billing data
interface MonthlyBill {
  month: string; // e.g., "2025-04"
  tokens_used: number;
  subscriptionCost: number;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  messages_per_month: number | null;
  token_allocation: number | null;
  integrations_allowed: number | null; // Added this line
  features: Json | null; 
  owner_id: string | null;
  team_id?: string | null; // Made team_id optional
  created_at: string;
}

// Define Subscription interface based on the new table
type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

interface SubscriptionWithPlan {
  id: string;
  profile_id: string;
  plan_id: string;
  team_id?: string | null; // Made team_id optional
  status: SubscriptionStatus;
  subscribed_at: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  ended_at: string | null;
  trial_end_date?: string | null; // Added trial_end_date
  plans: Plan; // Joined plan details
}

export function BillingStats() {
  const { data: userSession } = useQuery({
    queryKey: ['user-session-auth'],
    queryFn: async () => supabase.auth.getUser(),
  });
  const userId = userSession?.data?.user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubscribing, setIsSubscribing] = React.useState<string | null>(null); // plan.id of plan being subscribed to

  const { data: userSubscriptionData, isLoading: isLoadingSubscription } = useQuery<SubscriptionWithPlan | null>({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (*)
        `)
        .in('status', ['active', 'trialing', 'past_due']) // Active-like statuses
        .maybeSingle(); // Expect one or null

      if (error) {
        console.error("Error fetching user subscription:", error);
        throw error;
      }
      return data as SubscriptionWithPlan | null;
    },
  });
  
  const currentPlan = userSubscriptionData?.plans;
  const currentSubscriptionStatus = userSubscriptionData?.status;

  const handleSubscribeToPlan = async (plan: Plan) => {
    if (!userId || !plan || plan.name === 'Enterprise') { // Don't allow subscribing to Enterprise via button
      toast({ title: "Error", description: "Cannot subscribe to this plan automatically.", variant: "destructive" });
      return;
    }
    if (currentPlan?.id === plan.id && (currentSubscriptionStatus === 'active' || currentSubscriptionStatus === 'trialing')) {
      toast({ title: "Already Subscribed", description: "You are already subscribed to this plan.", variant: "default" });
      return;
    }

    setIsSubscribing(plan.id);
    try {
      // If there's an existing active/trialing/past_due subscription, we might want to "cancel" it first
      // or update it. For simplicity, this example assumes we are creating a new one,
      // which might fail if the unique constraint (uq_profile_active_subscription) is hit.
      // A more robust solution would handle upgrades/downgrades/cancellations.

      // For now, let's try to delete any existing active/trialing/past_due subscription for the user
      // This is a simplified approach. In a real app, you'd likely update the existing one or use Stripe webhooks.
      if (userSubscriptionData) {
        const { error: deleteError } = await supabase
          .from('subscriptions')
          .delete()
          .eq('id', userSubscriptionData.id);
        if (deleteError) {
          console.warn("Could not delete existing subscription, proceeding to create new one:", deleteError);
          // Not throwing error here, as the new insert might still work if old one was e.g. 'canceled'
        }
      }
      
      const now = new Date();
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(now.getMonth() + 1); // Simple 1 month period

      const { error: insertError } = await supabase.from('subscriptions').insert({
        profile_id: userId,
        plan_id: plan.id,
        status: 'active', // Default to active for this example
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        // subscribed_at will default to now() by the database
      });

      if (insertError) throw insertError;

      toast({ title: "Success!", description: `Successfully subscribed to the ${plan.name} plan.` });
      queryClient.invalidateQueries({ queryKey: ['user-subscription', userId] });
      queryClient.invalidateQueries({ queryKey: ['token-stats', userId, plan.id] }); // Re-fetch token stats with new plan
    } catch (error) {
      console.error("Error subscribing to plan:", error);
      toast({ title: "Subscription Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubscribing(null);
    }
  };

  const { data: tokenStats, isLoading: isLoadingTokenStats } = useQuery({
    queryKey: ['token-stats', userId, currentPlan?.id], // Add currentPlan.id to re-fetch if plan changes
    queryFn: async () => {
      if (!userId) return { monthlyAllocation: 0, totalUsageThisMonth: 0, monthlyBills: [] };

      // Monthly allocation now comes from the subscribed plan
      const monthlyAllocationFromPlan = currentPlan?.token_allocation || 0;

      // Get current month's usage (keep this part)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      // const { data: currentMonthUsageData } = await supabase
      //   .from('token_usage')
      //   .select('tokens_used')
      //   .eq('user_id', userId) // Use userId here
      //   .gte('created_at', startOfMonth.toISOString())
      //   .lt('created_at', endOfMonth.toISOString());

      // const totalUsageThisMonth = (currentMonthUsageData || []).reduce((sum, record) => sum + record.tokens_used, 0);
      const totalUsageThisMonth = 0; // TODO: Implement token usage tracking

      // --- Fetch historical monthly usage ---
      // This requires a more complex query, potentially a database function or view
      // For now, let's assume we get some dummy data or fetch all usage and process client-side (less efficient)

      // const { data: allUsage } = await supabase
      //   .from('token_usage')
      //   .select('tokens_used, created_at')
      //   .eq('user_id', userId) // Use userId here
      //   .order('created_at', { ascending: false }); // Fetch all usage

      const monthlyBillsData: Record<string, number> = {};
      // (allUsage || []).forEach(record => {
      //     const recordDate = new Date(record.created_at);
      //     const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`; // Format YYYY-MM
      //     monthlyBillsData[monthKey] = (monthlyBillsData[monthKey] || 0) + record.tokens_used;
      // });

      const monthlyBills: MonthlyBill[] = Object.entries(monthlyBillsData)
        .map(([month, tokens_used]) => {
          // Fetch the subscription cost for the month
          const monthDate = new Date(month + '-01');
          const year = monthDate.getFullYear();
          const monthNumber = monthDate.getMonth() + 1;

          // Find the subscription for the month
          const subscription = userSubscriptionData; // Assuming only one subscription per user
          const planPrice = subscription?.plans?.price || 0;

          return {
            month,
            tokens_used,
            subscriptionCost: planPrice,
          };
        })
        .sort((a, b) => b.month.localeCompare(a.month)); // Sort descending by month

      // --- End Fetch historical monthly usage ---

      return {
        monthlyAllocation: monthlyAllocationFromPlan,
        totalUsageThisMonth,
        monthlyBills
      };
    },
    enabled: !!userId, // Only run if userId is available
  });

  const { data: plansData, isLoading: isLoadingPlans } = useQuery<Plan[]>({
    queryKey: ['all-plans-data'], // Changed queryKey to avoid conflict if plans were fetched differently elsewhere
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true }); // Order plans by price or another relevant field

      if (error) {
        console.error("Error fetching plans:", error);
        throw error;
      }
      return data || [];
    },
  });

  if (isLoadingTokenStats || isLoadingPlans || isLoadingSubscription) {
    return (
      <div className="space-y-8">
         {/* Skeleton for Current Plan */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/2" />
          </CardContent>
        </Card>

        {/* Skeleton for Plan Choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6"> {/* Added padding to the main container */}
      {/* Display Current Subscription */}
      {currentPlan && (
        <Card className="shadow-lg"> {/* Added shadow for better visual separation */}
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Your Current Plan: {currentPlan.name}</CardTitle>
            <CardDescription>
              Status: <span className="font-semibold capitalize">{currentSubscriptionStatus?.replace("_", " ")}</span>
              {userSubscriptionData?.status === 'trialing' && userSubscriptionData.trial_end_date && (
                <span className="ml-2 text-sm text-muted-foreground">
                  (Trial ends on: {new Date(userSubscriptionData.trial_end_date).toLocaleDateString()})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Messages: {currentPlan.messages_per_month ? `${currentPlan.messages_per_month.toLocaleString()} / month` : 'Unlimited'}
            </p>
            {userSubscriptionData?.status === 'trialing' && userSubscriptionData.trial_end_date && (
              <p>
                Tokens: {currentPlan.token_allocation ? `${currentPlan.token_allocation.toLocaleString()} / trial period` : 'Unlimited'}
              </p>
            )}
            {userSubscriptionData?.current_period_end && userSubscriptionData.status !== 'trialing' && (
              <p>
                Renews at: {new Date(userSubscriptionData.current_period_end).toLocaleDateString()}
              </p>
            )}
             {/* Consider adding a button to "Manage Subscription" if applicable */}
          </CardContent>
        </Card>
      )}

      {/* Plan Selection Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {currentPlan ? 'Change Your Plan' : 'Choose Your Plan'}
          </CardTitle>
          <CardDescription>Select the perfect plan for your business needs. No hidden fees.</CardDescription>
        </CardHeader>
        <CardContent>
          {plansData && plansData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plansData.map((plan) => (
                <Card key={plan.id} className={`flex flex-col hover:shadow-xl transition-shadow ${currentPlan?.id === plan.id ? 'border-2 border-primary ring-2 ring-primary' : 'border'}`}>
                  <CardHeader className="pb-4"> {/* Adjusted padding */}
                    <CardTitle className="text-lg font-medium"> {/* Adjusted font size */}
                      {plan.name}
                      {currentPlan?.id === plan.id && <span className="text-xs text-primary font-normal ml-2 py-0.5 px-1.5 rounded-full bg-primary/10">(Current)</span>}
                      {plan.name === 'Trial' && <span className="text-xs text-yellow-600 font-normal ml-2 py-0.5 px-1.5 rounded-full bg-yellow-500/10">(Trial Plan)</span>}
                    </CardTitle>
                    <CardDescription className="text-sm"> {/* Adjusted font size */}
                      {plan.name === 'Starter' ? 'Perfect for small businesses getting started.' :
                       plan.name === 'Professional' ? 'Best for growing businesses.' :
                       plan.name === 'Enterprise' ? 'For large organizations with custom needs.' : 
                       plan.name === 'Trial' ? 'Get a taste of our features.' : 'Comprehensive features for your needs.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow pt-0"> {/* Adjusted padding and flex-grow */}
                    <div className="text-3xl font-bold my-2"> {/* Added margin */}
                      {plan.name === 'Enterprise' ? 'Contact Us' : 
                       plan.name === 'Trial' ? 'Free' : `RM ${plan.price} /month`}
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground"> {/* Adjusted spacing */}
                      {plan.messages_per_month && <li className="flex items-center"><CheckIcon className="mr-2 h-4 w-4 text-green-500" /> Up to {plan.messages_per_month.toLocaleString()} messages/month</li>}
                      {plan.token_allocation && <li className="flex items-center"><CheckIcon className="mr-2 h-4 w-4 text-green-500" /> {plan.token_allocation.toLocaleString()} tokens/month</li>}
                      {plan.name === 'Trial' && <li className="flex items-center"><CheckIcon className="mr-2 h-4 w-4 text-green-500" /> 1 Integration</li>}
                      {plan.name === 'Starter' && <li className="flex items-center"><CheckIcon className="mr-2 h-4 w-4 text-green-500" /> 3 Integrations</li>}
                      {plan.name === 'Professional' && <li className="flex items-center"><CheckIcon className="mr-2 h-4 w-4 text-green-500" /> 10 Integrations</li>}
                      {plan.features && Array.isArray(plan.features) && plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <CheckIcon className="mr-2 h-4 w-4 text-green-500" />
                          {String(feature)}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto pt-4"> {/* Ensure footer is at the bottom, added padding */}
                    {plan.name === 'Enterprise' ? (
                      <Button className="w-full" variant="outline">Contact Sales</Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribeToPlan(plan)}
                        disabled={currentPlan?.id === plan.id || !!isSubscribing || plan.name === 'Trial'}
                        variant={currentPlan?.id === plan.id ? "secondary" : "default"} // Changed variant for current plan
                      >
                        {isSubscribing === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSubscribing === plan.id ? 'Processing...' : 
                         plan.name === 'Trial' ? (currentPlan?.id === plan.id ? 'Current Trial' : 'Start Trial') :
                         (currentPlan?.id === plan.id ? 'Current Plan' : 'Choose Plan')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No plans available at the moment. Please check back later.</p>
          )}
        </CardContent>
      </Card>

      {/* Usage Overview Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Usage Overview</CardTitle>
          <CardDescription>Review your token usage and billing history.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTokenStats ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : tokenStats?.monthlyBills && tokenStats.monthlyBills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens Used</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tokenStats.monthlyBills.map(bill => (
                    <tr key={bill.month}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(bill.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.tokens_used.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">RM {bill.subscriptionCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">No billing history found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Icon (can be moved to a separate icons file)
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) { // Added Loader2 definition
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
