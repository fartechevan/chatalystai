import { UserStats } from "@/components/dashboard/UserStats";
import { UserChart } from "@/components/dashboard/UserChart";
import { SentimentChart } from "@/components/dashboard/SentimentChart";
import { SentimentBigQueryChart } from "@/components/dashboard/SentimentBigQueryChart";

const mockStats = {
  activeMonthly: 1234,
  activeWeekly: 456,
  newUsers: 78,
};

export default function Main() {
  return (
    <div className="space-y-8">
      <UserStats stats={mockStats} />
      <div className="grid gap-8 grid-cols-1 xl:grid-cols-2">
        <UserChart />
        <SentimentChart />
      </div>
      <div className="w-full">
        <SentimentBigQueryChart />
      </div>
    </div>
  );
}