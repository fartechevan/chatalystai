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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Vendor() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["blue_ice_data_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blue_ice_data_logs")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Blue Ice Data Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incoming</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log, index) => (
                <TableRow key={index}>
                  <TableCell className="max-w-md overflow-hidden text-ellipsis">
                    {log.incoming}
                  </TableCell>
                  <TableCell className="max-w-md overflow-hidden text-ellipsis">
                    {log.response}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}