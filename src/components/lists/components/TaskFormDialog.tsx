
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface TaskFormData {
  title: string;
  due_date: Date;
  type: 'follow-up' | 'meeting';
}

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export function TaskFormDialog({ isOpen, onClose, onTaskCreated }: TaskFormDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [taskType, setTaskType] = useState<'follow-up' | 'meeting'>('follow-up');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      due_date: new Date(),
      type: 'follow-up'
    }
  });

  const onSubmit = async (data: TaskFormData) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }

    try {
      const taskData = {
        title: data.title,
        due_date: date?.toISOString() || new Date().toISOString(),
        type: taskType,
        created_by: user.id,
        assignee_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Task created",
        description: "Your task has been successfully created.",
      });
      
      reset();
      onClose();
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (error: any) {
      toast({
        title: "Error creating task",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Task</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              {...register("title", { required: "Title is required" })}
              className={cn(errors.title && "border-destructive")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Task Type</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={taskType === 'follow-up' ? 'default' : 'outline'}
                onClick={() => setTaskType('follow-up')}
                className="flex-1"
              >
                Follow-up
              </Button>
              <Button
                type="button"
                variant={taskType === 'meeting' ? 'default' : 'outline'}
                onClick={() => setTaskType('meeting')}
                className="flex-1"
              >
                Meeting
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
