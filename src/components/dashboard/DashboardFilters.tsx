
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
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <div className="flex bg-white/10 backdrop-blur-sm rounded-full overflow-hidden">
          <Tabs defaultValue={selectedTime} onValueChange={(value) => onTimeChange(value as any)} className="flex-1">
            <TabsList className="w-full bg-transparent h-10 rounded-none">
              <TabsTrigger 
                value="today" 
                className="flex-1 rounded-none border-0 text-white/90 h-10 data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Today
              </TabsTrigger>
              <TabsTrigger 
                value="yesterday" 
                className="flex-1 rounded-none border-0 text-white/90 h-10 data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Yesterday
              </TabsTrigger>
              <TabsTrigger 
                value="week" 
                className="flex-1 rounded-none border-0 text-white/90 h-10 data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Week
              </TabsTrigger>
              <TabsTrigger 
                value="month" 
                className="flex-1 rounded-none border-0 text-white/90 h-10 data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="ghost"
            className="rounded-none border-0 text-white/90 h-10 gap-2"
          >
            <Clock className="h-4 w-4" />
            Time
          </Button>
        </div>
        
        <div className="flex bg-white/10 backdrop-blur-sm rounded-full overflow-hidden">
          <Select
            defaultValue={selectedUser}
            onValueChange={onUserChange}
          >
            <SelectTrigger className="min-w-[180px] border-0 bg-transparent text-white/90 h-10 focus:ring-0 rounded-full">
              <SelectValue placeholder="Select user">
                {selectedUser === 'all' ? (
                  'All'
                ) : (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {profiles?.find(p => p.id === selectedUser)?.name || 'User'}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {profile.name || profile.email}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="ghost"
          className="rounded-full border-0 text-white/90 h-10 bg-white/10 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          Setup
        </Button>
      </div>
    </div>
  );
}
