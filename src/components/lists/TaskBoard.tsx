
import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  assignee: string;
  type: 'Meeting' | 'Follow-up';
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const initialColumns: Column[] = [
  {
    id: 'overdue',
    title: 'OVERDUE TASKS',
    tasks: [
      {
        id: '1',
        title: 'Follow-up',
        dueDate: '17.02.2025 All day',
        assignee: 'Evan Beh',
        type: 'Follow-up'
      }
    ]
  },
  {
    id: 'today',
    title: 'TO-DO TODAY',
    tasks: []
  },
  {
    id: 'tomorrow',
    title: 'TO-DO TOMORROW',
    tasks: [
      {
        id: '2',
        title: 'Meeting with Yean',
        dueDate: 'Tomorrow All day',
        assignee: 'Evan Beh',
        type: 'Meeting'
      }
    ]
  }
];

export function TaskBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destColumn) return;

    const task = sourceColumn.tasks[source.index];
    
    const newColumns = columns.map(col => {
      // Remove from source column
      if (col.id === source.droppableId) {
        const newTasks = [...col.tasks];
        newTasks.splice(source.index, 1);
        return { ...col, tasks: newTasks };
      }
      // Add to destination column
      if (col.id === destination.droppableId) {
        const newTasks = [...col.tasks];
        newTasks.splice(destination.index, 0, task);
        return { ...col, tasks: newTasks };
      }
      return col;
    });

    setColumns(newColumns);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Button variant="secondary" className="text-sm">DAY</Button>
          <Button variant="ghost" className="text-sm">WEEK</Button>
          <Button variant="ghost" className="text-sm">MONTH</Button>
        </div>
        <div className="flex items-center space-x-4">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            NEW TASK
          </Button>
        </div>
      </div>

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
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-background cursor-grab active:cursor-grabbing"
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col space-y-2">
                                <div className="text-sm font-medium">
                                  {task.dueDate}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  for {task.assignee}
                                </div>
                                <div className="flex items-center mt-2">
                                  <span className="text-sm font-medium">
                                    {task.type}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
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
    </div>
  );
}
