
import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface Task {
  id: string;
  title: string;
  due_date: string;
  assignee_id: string;
  type: 'Meeting' | 'Follow-up';
  status: 'overdue' | 'today' | 'tomorrow';
}

interface Column {
  id: 'overdue' | 'today' | 'tomorrow';
  title: string;
  tasks: Task[];
}

const COLUMN_TITLES = {
  overdue: 'OVERDUE TASKS',
  today: 'TO-DO TODAY',
  tomorrow: 'TO-DO TOMORROW',
};

export function TaskBoard() {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'overdue', title: COLUMN_TITLES.overdue, tasks: [] },
    { id: 'today', title: COLUMN_TITLES.today, tasks: [] },
    { id: 'tomorrow', title: COLUMN_TITLES.tomorrow, tasks: [] },
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`created_by.eq.${user.id},assignee_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error fetching tasks",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Group tasks by status and ensure type safety
      const groupedTasks = columns.map(column => ({
        ...column,
        tasks: (tasks?.filter(task => task.status === column.id) || []).map(task => ({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          assignee_id: task.assignee_id,
          type: task.type as 'Meeting' | 'Follow-up',
          status: task.status as 'overdue' | 'today' | 'tomorrow'
        }))
      }));

      setColumns(groupedTasks);
    };

    fetchTasks();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `created_by=eq.${user.id},assignee_id=eq.${user.id}`
        }, 
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination || !user) return;

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
    
    // Update task status in database
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: destination.droppableId,
        updated_at: new Date().toISOString()
      })
      .eq('id', draggableId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update local state
    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        const newTasks = [...col.tasks];
        newTasks.splice(source.index, 1);
        return { ...col, tasks: newTasks };
      }
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
                                  {task.due_date}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {task.title}
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
