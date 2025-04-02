
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

type StatsCardsProps = {
  activeMonthly: number;
  activeWeekly: number;
  totalUsers: number;
  onTotalUsersClick: () => void;
};

export function StatsCards({ activeMonthly, activeWeekly, totalUsers, onTotalUsersClick }: StatsCardsProps) {
  const navigate = useNavigate();
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent"
        onClick={() => navigate('/dashboard/conversations')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Monthly Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeMonthly}</div>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent"
        onClick={() => navigate('/dashboard/conversations')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Weekly Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeWeekly}</div>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent"
        onClick={() => navigate('/dashboard/leads')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">5</div>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent"
        onClick={onTotalUsersClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
        </CardContent>
      </Card>
    </div>
  );
}
