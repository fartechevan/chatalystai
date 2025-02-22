
import { format, startOfWeek, addDays } from "date-fns";
import { TaskCard } from "./components/TaskCard";

interface Task {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string;
  type: 'follow-up' | 'meeting';
}

interface WeeklyViewProps {
  tasks: Task[];
  selectedDate?: Date;
}

export function WeeklyView({ tasks, selectedDate = new Date() }: WeeklyViewProps) {
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="grid grid-cols-7 gap-2 h-[calc(100vh-200px)]">
      {weekDays.map((day, index) => {
        const dayTasks = tasks.filter(
          task => format(new Date(task.due_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        );

        return (
          <div key={index} className="flex flex-col h-full">
            <div className="text-sm font-medium p-2 text-center bg-muted/30 rounded-t-lg">
              <div>{format(day, 'EEE')}</div>
              <div>{format(day, 'd')}</div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-muted/10 rounded-b-lg">
              {dayTasks.map(task => (
                <TaskCard key={task.id} task={task} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
