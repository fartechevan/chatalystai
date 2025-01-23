import { UserStats } from "@/components/dashboard/UserStats";
import { UserChart } from "@/components/dashboard/UserChart";

export default function Main() {
  console.log("Rendering Main component");
  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      <UserStats />
      <div className="grid gap-8 grid-cols-1 xl:grid-cols-2">
        <UserChart />
      </div>
    </div>
  );
}