
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface KanbanStageProps {
  name: string;
  leadsCount?: number;
  value?: number;
}

export function KanbanStage({ name, leadsCount = 0, value = 0 }: KanbanStageProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{name}</h3>
        <span className="text-sm text-muted-foreground">
          {leadsCount} leads: {value} RM
        </span>
      </div>
      <Card className="flex-1 p-4 bg-muted/30">
        <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-4">
          <Button variant="ghost" className="text-sm">
            Quick add
          </Button>
        </div>
      </Card>
    </div>
  );
}
