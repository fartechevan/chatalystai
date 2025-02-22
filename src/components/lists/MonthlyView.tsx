
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addDays, startOfWeek } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { TaskCard } from "./components/TaskCard";

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
  onTaskUpdate?: (taskId: string, newDate: Date) => Promise<void>;
}

export function MonthlyView({ tasks, selectedDate = new Date(), onTaskUpdate }: MonthlyViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const daysInView = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination || !onTaskUpdate) return;

    // Find the task and get its current time
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // If dropped in the same spot, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Get the current time from the task
    const currentTaskTime = new Date(task.due_date);
    
    // Get the target day from our days array
    const targetDay = daysInView[parseInt(destination.droppableId)];
    
    // Create new date preserving the original time
    const newDate = new Date(targetDay);
    newDate.setHours(currentTaskTime.getHours());
    newDate.setMinutes(currentTaskTime.getMinutes());

    await onTaskUpdate(draggableId, newDate);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-7 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-sm font-medium p-2 text-center">
            {day}
          </div>
        ))}
        
        {daysInView.map((day, index) => {
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
              <Droppable droppableId={index.toString()}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-1 overflow-y-auto max-h-[80px]"
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
