
import { useState } from "react";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Main() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('month');
  const [userFilter, setUserFilter] = useState<string>('all');
  
  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  
  return (
    <div className="flex-1 flex flex-col -mt-8 -mx-8">
      <div className="h-[50vh] bg-gradient-to-b from-blue-950/30 to-slate-900/30 bg-cover bg-center" 
           style={{ backgroundImage: "url('/public/lovable-uploads/e73def24-3842-4c3a-ab86-5504e4129c63.png')" }}>
        <div className="container mx-auto px-8 py-6 flex flex-col items-center">
          <DashboardHeader />
          <div className="mt-8 w-full">
            <DashboardFilters 
              selectedTime={timeFilter}
              onTimeChange={setTimeFilter}
              selectedUser={userFilter}
              onUserChange={setUserFilter}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 bg-transparent -mt-4 pb-6">
        <div className="container mx-auto px-8">
          <DashboardStats timeFilter={timeFilter} userFilter={userFilter} />
        </div>
      </div>
    </div>
  );
}
