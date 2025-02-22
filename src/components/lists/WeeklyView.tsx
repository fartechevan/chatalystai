
import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

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
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start from Monday

  // Generate array of 7 days starting from startDate
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
                <Card key={task.id} className="bg-background">
                  <CardContent className="p-2">
                    <div className="text-xs font-medium">
                      {format(new Date(task.due_date), 'HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {task.title}
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                      task.type === 'meeting' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {task.type === 'meeting' ? 'Meeting' : 'Follow-up'}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
