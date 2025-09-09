
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
  selectedTime: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  onTimeChange: (value: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => void;
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
    <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
        <Tabs value={selectedTime} onValueChange={(value) => onTimeChange(value as 'today' | 'yesterday' | 'week' | 'month' | 'custom')} className="w-auto">
            <TabsList className="bg-card border rounded-full p-1 h-auto">
                <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Today</TabsTrigger>
                <TabsTrigger value="yesterday" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Yesterday</TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Week</TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">Month</TabsTrigger>
            </TabsList>
        </Tabs>
        
        {/* User Select */}
        <Select defaultValue={selectedUser} onValueChange={onUserChange}>
            <SelectTrigger className="w-full md:w-auto h-10 rounded-md bg-card border text-foreground data-[placeholder]:text-muted-foreground px-3">
            <SelectValue placeholder="Select user">
                {selectedUser === 'all' ? (
                <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 flex-shrink-0" />
                    All Users
                </div>
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
    </div>
  );
}
