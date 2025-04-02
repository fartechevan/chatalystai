
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
import { useState } from "react";

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
      
      <div className="h-full flex">
        <div className="border-l border-white/20"></div>
        <Select
          defaultValue={selectedUser}
          onValueChange={onUserChange}
        >
          <SelectTrigger className="w-[180px] border-0 bg-transparent text-white/90 h-10 focus:ring-0">
            <SelectValue placeholder="Select user">
              {selectedUser === 'all' ? (
                'All Users'
              ) : (
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  {profiles?.find(p => p.id === selectedUser)?.name || 'Evan Bch'}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
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
      
      <div className="border-l border-white/20"></div>
      <Button 
        variant="ghost"
        className="rounded-none border-0 text-white/90 h-10"
      >
        <Settings className="h-4 w-4 mr-2" />
        Setup
      </Button>
    </div>
  );
}
