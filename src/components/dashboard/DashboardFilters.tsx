
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardFiltersProps {
  selectedTime: 'today' | 'yesterday' | 'week' | 'month';
  onTimeChange: (value: 'today' | 'yesterday' | 'week' | 'month') => void;
  selectedUser: string;
  onUserChange: (value: string) => void;
}

export function DashboardFilters({ 
  selectedTime, 
  onTimeChange, 
  selectedUser, 
  onUserChange 
}: DashboardFiltersProps) {
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*");
      return data || [];
    },
  });

  return (
    <div className="max-w-3xl mx-auto mt-4 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden flex">
      <div className="flex-1 flex">
        <Button 
          variant={selectedTime === 'today' ? "secondary" : "ghost"}
          onClick={() => onTimeChange('today')}
          className="rounded-none border-0 text-white/90 h-10"
        >
          Today
        </Button>
        <Button 
          variant={selectedTime === 'yesterday' ? "secondary" : "ghost"}
          onClick={() => onTimeChange('yesterday')}
          className="rounded-none border-0 text-white/90 h-10"
        >
          Yesterday
        </Button>
        <Button 
          variant={selectedTime === 'week' ? "secondary" : "ghost"}
          onClick={() => onTimeChange('week')}
          className="rounded-none border-0 text-white/90 h-10"
        >
          Week
        </Button>
        <Button 
          variant={selectedTime === 'month' ? "secondary" : "ghost"}
          onClick={() => onTimeChange('month')}
          className="rounded-none border-0 text-white/90 h-10"
        >
          Month
        </Button>
        <Button 
          variant="ghost"
          className="rounded-none border-0 text-white/90 h-10 gap-2"
        >
          <Clock className="h-4 w-4" />
          Time
        </Button>
      </div>
      
      <div className="h-full flex">
        <div className="border-l border-white/20"></div>
        <Button 
          variant={selectedUser === 'all' ? "secondary" : "ghost"}
          onClick={() => onUserChange('all')}
          className="rounded-none border-0 text-white/90 h-10"
        >
          All
        </Button>
        {profiles?.length > 0 && (
          <div className="flex items-center px-4">
            <span className="text-white/90 flex items-center">
              Evan Bch
              <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
            </span>
          </div>
        )}
      </div>
      
      <div className="border-l border-white/20"></div>
      <Button 
        variant="ghost"
        className="rounded-none border-0 text-white/90 h-10"
      >
        <Settings className="h-4 w-4" />
        Setup
      </Button>
    </div>
  );
}
