import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types'; // Import generated types

type Broadcast = Database['public']['Tables']['broadcasts']['Row'];
type BroadcastRecipient = Database['public']['Tables']['broadcast_recipients']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row'] | null; // Join customer name
};

const BroadcastDetailsView = () => {
  const { broadcastId } = useParams<{ broadcastId: string }>();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!broadcastId) {
      setError("Broadcast ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchBroadcastDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch broadcast details
        const { data: broadcastData, error: broadcastError } = await supabase
          .from('broadcasts')
          .select('*')
          .eq('id', broadcastId)
          .single();

        if (broadcastError) throw broadcastError;
        setBroadcast(broadcastData);

        // Fetch recipients with customer names
        const { data: recipientsData, error: recipientsError } = await supabase
          .from('broadcast_recipients')
          .select(`
            *,
            customers ( name )
          `)
          .eq('broadcast_id', broadcastId)
          .order('updated_at', { ascending: false }); // Show most recent updates first

        if (recipientsError) throw recipientsError;
        // Cast the data to the correct type
        setRecipients(recipientsData as BroadcastRecipient[] || []);

      } catch (err: unknown) { // Use unknown instead of any
        console.error("Error fetching broadcast details:", err);
        // Check if it's an error object before accessing message
        const message = err instanceof Error ? err.message : "Failed to load broadcast details.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBroadcastDetails();
  }, [broadcastId]);

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'default'; // Greenish/Default
      case 'failed':
        return 'destructive'; // Red
      case 'pending':
      default:
        return 'secondary'; // Grey
    }
  };

  if (isLoading) return <div className="p-6">Loading broadcast details...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!broadcast) return <div className="p-6">Broadcast not found.</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Link to="/dashboard/broadcasts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Broadcast History
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast Details</CardTitle>
          <CardDescription>
            Sent on: {format(new Date(broadcast.created_at), 'PPpp')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Message:</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{broadcast.message_text}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Recipients ({recipients.length}):</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No recipients found for this broadcast.</TableCell>
                    </TableRow>
                  ) : (
                    recipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell>{recipient.customers?.name ?? 'N/A'}</TableCell>
                        <TableCell>{recipient.phone_number}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(recipient.status)}>
                            {recipient.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(recipient.updated_at), 'Pp')}</TableCell>
                        <TableCell className="text-xs text-red-600">{recipient.error_message ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastDetailsView;
