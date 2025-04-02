
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="flex justify-between mt-4">
      <div className="flex gap-2">
        <Button 
          variant={selectedTime === 'today' ? "secondary" : "outline"}
          onClick={() => onTimeChange('today')}
          className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
        >
          Today
        </Button>
        <Button 
          variant={selectedTime === 'yesterday' ? "secondary" : "outline"}
          onClick={() => onTimeChange('yesterday')}
          className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
        >
          Yesterday
        </Button>
        <Button 
          variant={selectedTime === 'week' ? "secondary" : "outline"}
          onClick={() => onTimeChange('week')}
          className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
        >
          Week
        </Button>
        <Button 
          variant={selectedTime === 'month' ? "secondary" : "outline"}
          onClick={() => onTimeChange('month')}
          className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
        >
          Month
        </Button>
        <Button 
          variant="outline"
          className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10 gap-2"
        >
          <Clock className="h-4 w-4" />
          Time
        </Button>
      </div>
      <div className="flex gap-2">
        <Button 
          variant={selectedUser === 'all' ? "secondary" : "outline"}
          onClick={() => onUserChange('all')}
          className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
        >
          All
        </Button>
        {profiles?.length > 0 && (
          <Button 
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white/90 border-white/10 gap-2"
          >
            Evan Sch
            <span className="text-xs opacity-60">▼</span>
          </Button>
        )}
        <Button 
          variant="outline"
          className="ml-2 bg-white/20 hover:bg-white/30 text-white border-white/10"
        >
          Setup
        </Button>
      </div>
    </div>
  );
}
