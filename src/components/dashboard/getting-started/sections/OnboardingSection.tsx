
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function OnboardingSection() {
  const completedTasks = 0;
  const totalTasks = 7;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Onboarding Steps</CardTitle>
        <button className="text-sm text-blue-500 hover:text-blue-600">
          Show Onboarding Steps →
        </button>
      </CardHeader>
      <CardContent>
        <Progress value={(completedTasks / totalTasks) * 100} className="h-2" />
        <p className="mt-2 text-sm text-muted-foreground">
          {completedTasks} of {totalTasks} Tasks Completed
        </p>
      </CardContent>
    </Card>
  );
}
