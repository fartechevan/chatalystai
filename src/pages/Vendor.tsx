import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/integrations/supabase/types";

type BlueIceLog = Database['public']['Tables']['blue_ice_data_logs']['Row'];

const Vendor = () => {
  const { toast } = useToast();
  
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['blueIceLogs'],
    queryFn: async () => {
      console.log('Fetching blue ice logs...');
      const { data, error } = await supabase
        .from('blue_ice_data_logs')
        .select('*');
      
      if (error) {
        console.error('Error fetching logs:', error);
        toast({
          variant: "destructive",
          title: "Error fetching logs",
          description: error.message,
        });
        throw error;
      }
      
      console.log('Fetched logs:', data);
      return data;
    },
  });

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-red-500">
          Error loading logs: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              Select Vendor
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
            <DropdownMenuItem>
              BlueIce
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incoming</TableHead>
              <TableHead>Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs && logs.length > 0 ? (
              logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell className="max-w-[300px] truncate">
                    {log.incoming}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {log.response}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Vendor;