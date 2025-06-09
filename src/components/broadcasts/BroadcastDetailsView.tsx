import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, CopyIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Broadcast = Database['public']['Tables']['broadcasts']['Row'];
type BroadcastRecipient = Database['public']['Tables']['broadcast_recipients']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
};

const BroadcastDetailsSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6">
    <Skeleton className="h-6 w-48 mb-4" /> {/* Back link */}
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4 mb-2" /> {/* Title */}
        <Skeleton className="h-4 w-1/2" /> {/* Description */}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4" /> {/* Info Label */}
          <Skeleton className="h-5 w-1/2" /> {/* Info Value */}
          <Skeleton className="h-5 w-1/4" /> {/* Info Label */}
          <Skeleton className="h-5 w-1/2" /> {/* Info Value */}
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3 mb-2" /> {/* Message Heading */}
          <Skeleton className="h-20 w-full" /> {/* Message Content */}
        </div>
        <Separator />
        <div>
          <Skeleton className="h-6 w-1/3 mb-4" /> {/* Recipients Heading */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);


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
        const { data: broadcastData, error: broadcastError } = await supabase
          .from('broadcasts')
          .select('*')
          .eq('id', broadcastId)
          .single();
        if (broadcastError) throw broadcastError;
        setBroadcast(broadcastData);

        const { data: recipientsData, error: recipientsError } = await supabase
          .from('broadcast_recipients')
          .select(`*, customers (name)`)
          .eq('broadcast_id', broadcastId)
          .order('updated_at', { ascending: false });
        if (recipientsError) throw recipientsError;
        setRecipients(recipientsData as BroadcastRecipient[] || []);
      } catch (err: unknown) {
        console.error("Error fetching broadcast details:", err);
        const message = err instanceof Error ? err.message : "Failed to load broadcast details.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBroadcastDetails();
  }, [broadcastId]);

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'sent': return 'default';
      case 'failed': return 'destructive';
      case 'pending': default: return 'secondary';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Consider adding a toast notification here for user feedback
      console.log("Message copied to clipboard");
    }).catch(err => {
      console.error("Failed to copy message: ", err);
    });
  };

  if (isLoading) return <BroadcastDetailsSkeleton />;

  if (error) return (
    <div className="p-4 md:p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  if (!broadcast) return (
    <div className="p-4 md:p-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Broadcast not found.</AlertDescription>
      </Alert>
    </div>
  );
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/dashboard/broadcasts" className="inline-flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Broadcasts
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Broadcast Details</CardTitle>
          <CardDescription>ID: {broadcast.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Broadcast Info */}
            <div className="lg:w-1/3 space-y-3">
              <div>
                <p className="font-medium text-muted-foreground text-sm">Sent On</p>
                <p className="text-sm">{format(new Date(broadcast.created_at), 'PPpp')}</p>
              </div>
              {/* Add any other brief details here if needed in the future */}
            </div>

            {/* Right Column: Message Section */}
            <div className="lg:w-2/3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold flex items-center">
                  Message Content
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(broadcast.message_text)}>
                        <CopyIcon className="mr-2 h-3.5 w-3.5" /> Copy
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy message to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm min-h-[100px]">
                {broadcast.message_text}
              </div>
            </div>
          </div>

          <Separator />

          {/* Recipients Section (Full Width) */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Recipients Status ({recipients.length})</h3>
            <ScrollArea className="border rounded-md h-[400px]"> {/* Adjust height as needed */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="min-w-[150px]">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No recipients found for this broadcast.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell className="font-medium">{recipient.customers?.name ?? <span className="text-xs text-muted-foreground">N/A</span>}</TableCell>
                        <TableCell>{recipient.phone_number}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(recipient.status)} className="capitalize">
                            {recipient.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(recipient.updated_at), 'PPp')}</TableCell>
                        <TableCell className="text-xs text-red-500 max-w-xs truncate" title={recipient.error_message ?? undefined}>
                          {recipient.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastDetailsView;
