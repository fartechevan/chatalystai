
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { DraggableProvided } from "@hello-pangea/dnd";

interface Task {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string;
  type: 'follow-up' | 'meeting';
}

interface TaskCardProps {
  task: Task;
  dragProvided?: DraggableProvided;
  compact?: boolean;
}

export function TaskCard({ task, dragProvided, compact = false }: TaskCardProps) {
  const cardProps = dragProvided ? {
    ref: dragProvided.innerRef,
    ...dragProvided.draggableProps,
    ...dragProvided.dragHandleProps,
  } : {};

  return (
    <Card
      {...cardProps}
      className="bg-background cursor-grab active:cursor-grabbing"
    >
      <CardContent className={compact ? "p-2" : "p-4"}>
        <div className="flex flex-col space-y-2">
          <div className="text-sm font-medium">
            {format(new Date(task.due_date), compact ? 'HH:mm' : 'PPp')}
          </div>
          <div className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>
            {task.title}
          </div>
          <div className="flex items-center mt-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              task.type === 'meeting' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {task.type === 'meeting' ? 'Meeting' : 'Follow-up'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
