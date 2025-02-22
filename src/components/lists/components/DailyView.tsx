
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { TaskCard } from "./TaskCard";

interface Task {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string;
  type: 'follow-up' | 'meeting';
}

interface Column {
  id: 'overdue' | 'today' | 'tomorrow';
  title: string;
  tasks: Task[];
}

interface DailyViewProps {
  columns: Column[];
  onDragEnd: (result: any) => void;
}

export function DailyView({ columns, onDragEnd }: DailyViewProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id}>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-muted-foreground">
                  {column.title}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {column.tasks.length} {column.tasks.length === 1 ? 'to-do' : 'to-dos'}
                </span>
              </div>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="mt-4 space-y-4"
                >
                  {column.tasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(provided) => (
                        <TaskCard task={task} dragProvided={provided} />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
