import React, { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Import Badge
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"; // Import Table components
import { BroadcastModal } from "@/components/dashboard/conversations/BroadcastModal";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Copy } from 'lucide-react'; // Import Copy icon

// Define the type for a broadcast record (adjust based on your table structure)
interface Broadcast {
  id: string;
  message_text: string;
  created_at: string;
  status?: string; // Optional status field
  // Add other relevant fields like instance_id, recipient_count if needed
}

const BroadcastsPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageToDuplicate, setMessageToDuplicate] = useState<string | null>(null); // State for message to duplicate

  // Filter broadcasts based on search term
  const filteredBroadcasts = useMemo(() => {
    if (!searchTerm) {
      return broadcasts;
    }
    return broadcasts.filter(broadcast =>
      broadcast.message_text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [broadcasts, searchTerm]);

  // Fetch past broadcasts
  useEffect(() => {
    const fetchBroadcasts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('broadcasts')
          .select('*')
          .order('created_at', { ascending: false }); // Order by most recent

        if (fetchError) throw fetchError;
        setBroadcasts(data || []);
      } catch (err: unknown) { // Use unknown instead of any
        console.error("Error fetching broadcasts:", err);
        const message = err instanceof Error ? err.message : "Failed to load broadcasts.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBroadcasts();
  }, []); // Fetch on component mount

  const handleOpenModal = () => setIsModalOpen(true);

  // Updated handleCloseModal to also clear the duplicate message
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMessageToDuplicate(null); // Clear message on close
  };

  const handleViewDetails = (broadcastId: string) => {
    navigate(`/dashboard/broadcasts/${broadcastId}`);
  };

  // Handler for the duplicate button click
  const handleDuplicateClick = (message: string) => {
    setMessageToDuplicate(message);
    handleOpenModal(); // Open the modal
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-8"> {/* Adjusted padding and spacing */}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4"> {/* Removed mb-6, space-y-8 on parent handles it */}
        <h1 className="text-2xl font-semibold">Broadcast History</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64" // Adjusted width
          />
          <Button onClick={handleOpenModal} className="w-full sm:w-auto">New Broadcast</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="px-6 py-4"> {/* Adjusted padding */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3"> {/* Increased gap */}
              <CardTitle className="text-xl">Past Broadcasts</CardTitle> {/* Slightly smaller title for card context */}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0"> {/* Remove padding if table handles it, or use p-6 if table needs container padding */}
          {isLoading && <div className="p-6 text-center"><p>Loading broadcast history...</p></div>}
          {error && <div className="p-6 text-center"><p className="text-red-500">{error}</p></div>}
          {!isLoading && !error && broadcasts.length > 0 && filteredBroadcasts.length === 0 && (
             <div className="p-6 text-center"><p>No broadcasts match your search term.</p></div>
          )}
          {!isLoading && !error && broadcasts.length === 0 && (
            <div className="p-6 text-center"><p>No broadcast messages sent yet. Create one to get started!</p></div>
          )}
          {!isLoading && !error && filteredBroadcasts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Message</TableHead>
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Sent Date</TableHead>
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBroadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id} className="hover:bg-muted/50"> {/* Added hover state */}
                    <TableCell className="p-4 align-middle font-medium max-w-md truncate">
                      {broadcast.message_text}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-muted-foreground"> {/* Standardized text color */}
                      {format(new Date(broadcast.created_at), 'PPpp')}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-muted-foreground">
                      {broadcast.status || 'Sent'}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-right space-x-2">
                      {/* Duplicate Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click navigation
                          handleDuplicateClick(broadcast.message_text);
                        }}
                        title="Duplicate Broadcast"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {/* View Details Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                           e.stopPropagation(); // Prevent row click navigation
                           handleViewDetails(broadcast.id);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Modal - Pass initialMessage */}
      <BroadcastModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialMessage={messageToDuplicate ?? undefined} // Pass message or undefined
      />
    </div>
  );
};

export default BroadcastsPage;
