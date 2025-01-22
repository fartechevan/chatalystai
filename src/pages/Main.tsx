import { UserStats } from "@/components/dashboard/UserStats";
import { UserChart } from "@/components/dashboard/UserChart";
import { SentimentBigQueryChart } from "@/components/dashboard/SentimentBigQueryChart";

export default function Main() {
  return (
    <div className="space-y-8">
      <UserStats />
      <div className="grid gap-8 grid-cols-1 xl:grid-cols-2">
        <UserChart />
        <SentimentBigQueryChart />
      </div>
    </div>
  );
}