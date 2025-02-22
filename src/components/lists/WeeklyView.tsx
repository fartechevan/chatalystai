
import { format, startOfWeek, addDays } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  onTaskUpdate?: (taskId: string, newDate: Date) => Promise<void>;
}

export function WeeklyView({ tasks, selectedDate = new Date(), onTaskUpdate }: WeeklyViewProps) {
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination || !onTaskUpdate) return;

    const sourceDay = weekDays[parseInt(source.droppableId)];
    const destinationDay = weekDays[parseInt(destination.droppableId)];

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Update the task's due date to the new day
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    const currentTaskTime = new Date(task.due_date);
    const newDate = new Date(destinationDay);
    newDate.setHours(currentTaskTime.getHours());
    newDate.setMinutes(currentTaskTime.getMinutes());

    await onTaskUpdate(draggableId, newDate);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
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
              <Droppable droppableId={index.toString()}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 p-2 space-y-2 overflow-y-auto bg-muted/10 rounded-b-lg"
                  >
                    {dayTasks.map((task, taskIndex) => (
                      <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                        {(provided) => (
                          <TaskCard task={task} dragProvided={provided} compact />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
