
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
    <div className="mb-3 flex justify-between items-center">
      <div className="flex items-center gap-2 text-sm text-white/90">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-sm">{count}</span>
        <span className="text-green-400 text-sm">0</span>
      </div>
    </div>
  );
}

interface TasksSectionProps {
  className?: string;
  tasks?: any[];
}

export function TasksSection({ className = "", tasks = [] }: TasksSectionProps) {
  // Count tasks by type
  const followUpTasks = tasks.filter(t => t.type === "follow-up").length;
  const meetingTasks = tasks.filter(t => t.type === "meeting").length;
  const otherTasks = tasks.filter(t => !t.type || (t.type !== "follow-up" && t.type !== "meeting")).length;
  
  const totalTasks = tasks.length;
  
  return (
    <div className={`rounded-lg bg-blue-950/80 p-4 flex flex-col h-full ${className}`}>
      <div className="font-semibold text-xs uppercase tracking-wide text-white/70 mb-2">
        TASKS
      </div>
      <div className="text-4xl font-bold text-indigo-400 my-1">
        {totalTasks}
      </div>
      <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
        <span className="text-white/50 text-xs">this month</span>
      </div>
      <div className="h-px bg-white/10 my-3"></div>
      <div className="space-y-1 flex-1">
        <Task icon="🔄" label="Follow-up" count={followUpTasks} color="bg-blue-500" />
        <Task icon="📅" label="Meeting" count={meetingTasks} color="bg-yellow-500" />
        <Task icon="❓" label="Other" count={otherTasks} color="bg-gray-500" />
      </div>
    </div>
  );
}
