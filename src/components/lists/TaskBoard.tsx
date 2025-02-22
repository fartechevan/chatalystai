import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { WeeklyView } from "./WeeklyView";
import { MonthlyView } from "./MonthlyView";
import { ViewSelector } from "./components/ViewSelector";
import { DailyView } from "./components/DailyView";

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

const COLUMN_TITLES = {
  overdue: 'OVERDUE TASKS',
  today: 'TO-DO TODAY',
  tomorrow: 'TO-DO TOMORROW',
};

type ViewMode = 'day' | 'week' | 'month';

export function TaskBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([
    { id: 'overdue', title: COLUMN_TITLES.overdue, tasks: [] },
    { id: 'today', title: COLUMN_TITLES.today, tasks: [] },
    { id: 'tomorrow', title: COLUMN_TITLES.tomorrow, tasks: [] },
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  const categorizeTaskByDueDate = (task: Task) => {
    const dueDate = new Date(task.due_date);
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return 'overdue';
    } else if (isToday(dueDate)) {
      return 'today';
    } else if (isTomorrow(dueDate)) {
      return 'tomorrow';
    }
    return null;
  };

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      const { data: fetchedTasks, error } = await supabase
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

      setTasks(fetchedTasks || []);

      const groupedTasks = columns.map(column => ({
        ...column,
        tasks: (fetchedTasks || [])
          .filter(task => categorizeTaskByDueDate(task) === column.id)
          .map(task => ({
            id: task.id,
            title: task.title,
            due_date: task.due_date,
            assignee_id: task.assignee_id,
            type: task.type as 'follow-up' | 'meeting'
          }))
      }));

      setColumns(groupedTasks);
    };

    fetchTasks();

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
    
    let newDueDate = new Date();
    if (destination.droppableId === 'tomorrow') {
      newDueDate.setDate(newDueDate.getDate() + 1);
    }
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        due_date: newDueDate.toISOString(),
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

    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        const newTasks = [...col.tasks];
        newTasks.splice(source.index, 1);
        return { ...col, tasks: newTasks };
      }
      if (col.id === destination.droppableId) {
        const newTasks = [...col.tasks];
        newTasks.splice(destination.index, 0, {
          ...task,
          due_date: newDueDate.toISOString()
        });
        return { ...col, tasks: newTasks };
      }
      return col;
    });

    setColumns(newColumns);
  };

  const handleTaskUpdate = async (taskId: string, newDate: Date) => {
    const { error } = await supabase
      .from('tasks')
      .update({ 
        due_date: newDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, due_date: newDate.toISOString() }
          : task
      )
    );

    const updatedTask = tasks.find(t => t.id === taskId);
    if (updatedTask) {
      const newTask = { ...updatedTask, due_date: newDate.toISOString() };
      const newColumns = columns.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t.id !== taskId)
      }));

      const category = categorizeTaskByDueDate(newTask);
      if (category) {
        const columnIndex = newColumns.findIndex(col => col.id === category);
        if (columnIndex !== -1) {
          newColumns[columnIndex].tasks.push(newTask);
        }
      }

      setColumns(newColumns);
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'week':
        return <WeeklyView tasks={tasks} onTaskUpdate={handleTaskUpdate} />;
      case 'month':
        return <MonthlyView tasks={tasks} onTaskUpdate={handleTaskUpdate} />;
      default:
        return <DailyView columns={columns} onDragEnd={onDragEnd} />;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <ViewSelector currentView={viewMode} onViewChange={setViewMode} />
        <div className="flex items-center space-x-4">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            NEW TASK
          </Button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
