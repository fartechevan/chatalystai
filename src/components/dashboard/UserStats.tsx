import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStats as UserStatsType } from "@/types/auth";

interface UserStatsProps {
  stats: UserStatsType;
}

export function UserStats({ stats }: UserStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="glass-card animate-enter">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeMonthly}</div>
        </CardContent>
      </Card>
      <Card className="glass-card animate-enter [animation-delay:100ms]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeWeekly}</div>
        </CardContent>
      </Card>
      <Card className="glass-card animate-enter [animation-delay:200ms]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.newUsers}</div>
        </CardContent>
      </Card>
    </div>
  );
}