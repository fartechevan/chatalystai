
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";

export function DashboardHeader() {
  const { user } = useAuth();
  const displayName = user?.email?.split('@')[0] || "User";

  return (
    <div className="flex justify-between items-center py-4 w-full">
      <div>
        <img src="/lovable-uploads/da0276ac-84ce-40bf-94fd-f3c49f732c94.png" alt="Kommo Logo" className="h-8" />
      </div>
      <div className="text-3xl font-bold text-white/90 text-center flex-1">
        {displayName}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search" 
            className="pl-10 bg-slate-800/50 border-slate-700/50 text-white"
          />
        </div>
        <Button variant="default" className="bg-slate-800 hover:bg-slate-700 text-white gap-2">
          EVENTS
        </Button>
      </div>
    </div>
  );
}
