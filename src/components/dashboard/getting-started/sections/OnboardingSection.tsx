
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function OnboardingSection() {
  const completedTasks = 0;
  const totalTasks = 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Steps</CardTitle>
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
