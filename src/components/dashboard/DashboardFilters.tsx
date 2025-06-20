
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, Settings, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="max-w-full mx-auto mt-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-center items-center"> {/* Added items-center */}
        {/* Time Period Tabs */}
        <Tabs defaultValue={selectedTime} onValueChange={(value) => onTimeChange(value as 'today' | 'yesterday' | 'week' | 'month')} className="w-auto">
          {/* Apply card background and border to TabsList, make it rounded */}
          <TabsList className="bg-card border rounded-full p-1 h-auto"> 
            {/* Remove individual styling from Triggers, rely on shadcn defaults and active state */}
            <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Today</TabsTrigger>
            <TabsTrigger value="yesterday" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Yesterday</TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Week</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* The "Time" button with Clock icon seems redundant if Tabs are used for time selection. Removing it. */}
        {/* If it was intended for a date range picker, that would be a different implementation. */}
        
        {/* User Select */}
        <Select defaultValue={selectedUser} onValueChange={onUserChange}>
          {/* Apply card background and border to SelectTrigger, make it rounded */}
          <SelectTrigger className="min-w-[180px] h-10 rounded-full bg-card border text-foreground data-[placeholder]:text-muted-foreground">
            <SelectValue placeholder="Select user">
              {selectedUser === 'all' ? (
                'All Users'
              ) : (
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">
                    {profiles?.find(p => p.id === selectedUser)?.name || profiles?.find(p => p.id === selectedUser)?.email || 'User'}
                  </span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {profiles?.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{profile.name || profile.email}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Setup Button */}
        <Button variant="outline" className="h-10 rounded-full bg-card border"> {/* Use outline variant with card background and border */}
          <Settings className="h-4 w-4 mr-2" />
          Setup
        </Button>
      </div>
    </div>
  );
}
