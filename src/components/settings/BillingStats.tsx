
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
// TODO: Import DataTable and columns if needed for monthly bills

// interface TokenUsageData {
//   tokens_used: number;
//   created_at: string;
// }

// TODO: Define interface for monthly billing data
interface MonthlyBill {
  month: string; // e.g., "2025-04"
  tokens_used: number;
}

export function BillingStats() {
  const { data: tokenStats, isLoading } = useQuery({
    queryKey: ['token-stats'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get monthly allocation
      const { data: allocation } = await supabase
        .from('token_allocations')
        .select('monthly_tokens')
        .eq('user_id', user.user.id)
        .single();

      // Get current month's usage (keep this part)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const { data: currentMonthUsageData } = await supabase
        .from('token_usage')
        .select('tokens_used')
        .eq('user_id', user.user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString());

      const totalUsageThisMonth = (currentMonthUsageData || []).reduce((sum, record) => sum + record.tokens_used, 0);

      // --- Fetch historical monthly usage ---
      // This requires a more complex query, potentially a database function or view
      // For now, let's assume we get some dummy data or fetch all usage and process client-side (less efficient)

      const { data: allUsage } = await supabase
        .from('token_usage')
        .select('tokens_used, created_at')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false }); // Fetch all usage

      const monthlyBillsData: Record<string, number> = {};
      (allUsage || []).forEach(record => {
          const recordDate = new Date(record.created_at);
          const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`; // Format YYYY-MM
          monthlyBillsData[monthKey] = (monthlyBillsData[monthKey] || 0) + record.tokens_used;
      });

      const monthlyBills: MonthlyBill[] = Object.entries(monthlyBillsData)
        .map(([month, tokens_used]) => ({ month, tokens_used }))
        .sort((a, b) => b.month.localeCompare(a.month)); // Sort descending by month

      // --- End Fetch historical monthly usage ---

      return {
        monthlyAllocation: allocation?.monthly_tokens || 0,
        totalUsageThisMonth,
        monthlyBills // Add monthly bills to the returned data
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  // TODO: Define columns for the DataTable if using one

  return (
    // Use flex or grid to arrange list on left, stats on right
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left Side: Monthly Bills List */}
      <div className="w-full md:w-2/3 space-y-4">
         <Card>
           <CardHeader>
             <CardTitle>Monthly Billing History</CardTitle>
             <CardDescription>Your token usage history by month.</CardDescription>
           </CardHeader>
           <CardContent>
             {/* TODO: Replace with DataTable or a simple list/table */}
             {isLoading ? (
               <Skeleton className="h-[200px] w-full" />
             ) : tokenStats?.monthlyBills && tokenStats.monthlyBills.length > 0 ? (
               <ul className="space-y-2">
                 {tokenStats.monthlyBills.map(bill => (
                   <li key={bill.month} className="flex justify-between items-center p-2 border-b">
                     <span>{new Date(bill.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                     <span className="font-medium">{bill.tokens_used.toLocaleString()} tokens</span>
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-muted-foreground">No billing history found.</p>
             )}
           </CardContent>
         </Card>
      </div>

      {/* Right Side: Allocation and Current Usage */}
      <div className="w-full md:w-1/3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Token Allocation</CardTitle>
            {/* <CardDescription>
              Your monthly token limit
            </CardDescription> */}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> :
              <div className="text-2xl font-bold">
                {tokenStats?.monthlyAllocation.toLocaleString()} tokens / month
              </div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Month Usage</CardTitle>
             {/* <CardDescription>
              Tokens used this month
            </CardDescription> */}
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-24 mb-2" /> :
              <div className="text-2xl font-bold">
                {tokenStats?.totalUsageThisMonth.toLocaleString()} tokens
              </div>
             }
             {isLoading ? <Skeleton className="h-4 w-36" /> :
              <div className="text-sm text-muted-foreground mt-1">
                {tokenStats?.monthlyAllocation && tokenStats.monthlyAllocation > 0
                  ? `${((tokenStats?.totalUsageThisMonth || 0) / tokenStats.monthlyAllocation * 100).toFixed(1)}% of allocation used`
                  : 'Allocation not set'}
              </div>
             }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
