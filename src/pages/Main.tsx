import { UserStats } from "@/components/dashboard/UserStats";
import { UserChart } from "@/components/dashboard/UserChart";

export default function Main() {
  console.log("Rendering Main component");
  return (
    <div className="space-y-8 animate-fade-up w-full">
      <h1 className="text-3xl font-bold tracking-tight w-full">Dashboard Overview</h1>
      <UserStats />
      <div className="w-full">
        <UserChart />
      </div>
    </div>
  );
}