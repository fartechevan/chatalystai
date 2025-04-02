
import { Progress } from "@/components/ui/progress";

interface TaskProps {
  icon: string;
  label: string;
  count: number;
  total?: number;
  color?: string;
}

function Task({ icon, label, count, total = 10, color = "bg-blue-500" }: TaskProps) {
  const percentage = Math.min(Math.round((count / total) * 100), 100);
  
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <span>{icon}</span>
          <span>{label}</span>
        </div>
        <span className="text-white/70 text-sm">{count}</span>
      </div>
      <Progress value={percentage} className="h-1.5" indicatorClassName={color} />
    </div>
  );
}

interface TasksSectionProps {
  className?: string;
}

export function TasksSection({ className = "" }: TasksSectionProps) {
  return (
    <div className={`rounded-lg bg-blue-950/80 p-4 flex flex-col h-full ${className}`}>
      <div className="font-semibold text-xs uppercase tracking-wide text-white/70 mb-2">
        TASKS
      </div>
      <div className="text-4xl font-bold text-indigo-400 my-1">
        3
      </div>
      <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
        <span className="text-white/50 text-xs">this month</span>
      </div>
      <div className="h-px bg-white/10 my-3"></div>
      <div className="space-y-4 flex-1">
        <Task icon="🔄" label="Follow-up" count={2} color="bg-blue-500" />
        <Task icon="📅" label="Meeting" count={1} color="bg-yellow-500" />
        <Task icon="❓" label="Other" count={0} color="bg-gray-500" />
      </div>
    </div>
  );
}
