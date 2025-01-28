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

interface BlueIceLog {
  incoming: string | null;
  response: string | null;
}

const Vendor = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['blueIceLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blue_ice_data_logs')
        .select('*');
      
      if (error) throw error;
      return data as BlueIceLog[];
    },
  });

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
              logs.map((log) => (
                <TableRow key={log.incoming}>
                  <TableCell>{log.incoming}</TableCell>
                  <TableCell>{log.response}</TableCell>
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