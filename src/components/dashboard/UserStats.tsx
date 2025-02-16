
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStats } from "./stats/useUserStats";
import { Loader2 } from "lucide-react";

export function UserStats() {
  const stats = useUserStats();

  if (!stats.monthlyConversations || !stats.weeklyConversations) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.monthlyConversations.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Month {stats.currentMonth?.month_number || 'N/A'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Weekly Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.weeklyConversations.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Week {stats.currentWeek?.week_of_month || 'N/A'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
