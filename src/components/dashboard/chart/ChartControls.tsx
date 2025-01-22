import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Split } from "lucide-react";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface ChartControlsProps {
  timeRange: TimeRange;
  splitView: boolean;
  onTimeRangeChange: (value: TimeRange) => void;
  onSplitViewToggle: () => void;
}

export function ChartControls({
  timeRange,
  splitView,
  onTimeRangeChange,
  onSplitViewToggle,
}: ChartControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onSplitViewToggle}
        className="h-8 w-8"
      >
        <Split className="h-4 w-4" />
      </Button>
      <Select 
        value={timeRange} 
        onValueChange={onTimeRangeChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}