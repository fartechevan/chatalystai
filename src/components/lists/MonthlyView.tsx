
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string;
  type: 'follow-up' | 'meeting';
}

interface MonthlyViewProps {
  tasks: Task[];
  selectedDate?: Date;
}

export function MonthlyView({ tasks, selectedDate = new Date() }: MonthlyViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="grid grid-cols-7 gap-2">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
        <div key={day} className="text-sm font-medium p-2 text-center">
          {day}
        </div>
      ))}
      
      {daysInMonth.map((day, index) => {
        const dayTasks = tasks.filter(
          task => format(new Date(task.due_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        );

        return (
          <div 
            key={index} 
            className={`min-h-[120px] p-2 border rounded-lg ${
              isSameMonth(day, selectedDate) ? 'bg-muted/10' : 'bg-muted/30'
            }`}
          >
            <div className="text-sm font-medium mb-2">
              {format(day, 'd')}
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[80px]">
              {dayTasks.map(task => (
                <Card key={task.id} className="bg-background">
                  <CardContent className="p-2">
                    <div className="text-xs font-medium truncate">
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
