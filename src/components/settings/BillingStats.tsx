
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface TokenUsageData {
  tokens_used: number;
  created_at: string;
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

      // Get current month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usage } = await supabase
        .from('token_usage')
        .select('tokens_used, created_at')
        .eq('user_id', user.user.id)
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: true });

      // Calculate total usage this month
      const totalUsage = (usage || []).reduce((sum, record) => sum + record.tokens_used, 0);

      // Process daily usage for chart
      const dailyUsage: Record<string, number> = {};
      (usage || []).forEach((record: TokenUsageData) => {
        const date = record.created_at.split('T')[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + record.tokens_used;
      });

      const chartData = Object.entries(dailyUsage).map(([date, tokens]) => ({
        date,
        tokens
      }));

      return {
        monthlyAllocation: allocation?.monthly_tokens || 0,
        totalUsage,
        chartData
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

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Token Allocation</CardTitle>
            <CardDescription>
              Your monthly token limit for summarizing conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tokenStats?.monthlyAllocation.toLocaleString()} tokens
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Month Usage</CardTitle>
            <CardDescription>
              Tokens used this month for summarizing conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tokenStats?.totalUsage.toLocaleString()} tokens
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {((tokenStats?.totalUsage || 0) / (tokenStats?.monthlyAllocation || 1) * 100).toFixed(1)}% of allocation used
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Token Usage</CardTitle>
          <CardDescription>
            Token usage per day for the current month
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tokenStats?.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tokens" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
