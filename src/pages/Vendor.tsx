
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationView } from "@/components/dashboard/conversations/ConversationView";
import { useState } from "react";

export default function Vendor() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Query to fetch ETL data
  const { data: etlData, isLoading, refetch } = useQuery({
    queryKey: ['bigquery-etl-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bigquery_etl_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Function to trigger the sync
  const handleSync = async () => {
    try {
      const { error } = await supabase.functions.invoke('sync-bigquery-data');
      if (error) throw error;
      
      toast.success('Sync triggered successfully');
      // Refetch the data after sync
      refetch();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    }
  };

  const [showConversations, setShowConversations] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="etl" className="w-full">
        <TabsList>
          <TabsTrigger value="etl">ETL Dashboard</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>
        
        <TabsContent value="etl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>BigQuery ETL Dashboard</CardTitle>
              <Button onClick={handleSync}>
                Sync Data
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading ETL data...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created At</TableHead>
                      <TableHead>Processed At</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etlData?.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {row.processed_at 
                            ? new Date(row.processed_at).toLocaleString() 
                            : 'Not processed'}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {JSON.stringify(row.data)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!etlData?.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No ETL data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Customer Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              {showConversations ? (
                <ConversationView 
                  date={selectedDate}
                  onClose={() => setShowConversations(false)}
                />
              ) : (
                <Button
                  onClick={() => setShowConversations(true)}
                  className="w-full"
                >
                  View Conversations
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
