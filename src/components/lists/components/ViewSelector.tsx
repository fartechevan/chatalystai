
import { Button } from "@/components/ui/button";

type ViewMode = 'day' | 'week' | 'month';

interface ViewSelectorProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex space-x-2">
      <Button 
        variant={currentView === 'day' ? "secondary" : "ghost"}
        className="text-sm"
        onClick={() => onViewChange('day')}
      >
        DAY
      </Button>
      <Button 
        variant={currentView === 'week' ? "secondary" : "ghost"}
        className="text-sm"
        onClick={() => onViewChange('week')}
      >
        WEEK
      </Button>
      <Button 
        variant={currentView === 'month' ? "secondary" : "ghost"}
        className="text-sm"
        onClick={() => onViewChange('month')}
      >
        MONTH
      </Button>
    </div>
  );
}
