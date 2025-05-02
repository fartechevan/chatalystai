import React, { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Broadcast History</h1>
        <Button onClick={handleOpenModal}>New Broadcast</Button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search broadcasts by message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Broadcasts ({filteredBroadcasts.length})</CardTitle> {/* Show count */}
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading broadcast history...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && broadcasts.length > 0 && filteredBroadcasts.length === 0 && (
             <p>No broadcasts match your search term.</p>
          )}
          {!isLoading && !error && broadcasts.length === 0 && (
            <p>No broadcast messages sent yet.</p>
          )}
          {!isLoading && !error && filteredBroadcasts.length > 0 && ( // Use filteredBroadcasts
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Status</TableHead> {/* Placeholder */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBroadcasts.map((broadcast) => ( // Use filteredBroadcasts
                  <TableRow key={broadcast.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {broadcast.message_text}
                    </TableCell>
                    <TableCell>
                      {format(new Date(broadcast.created_at), 'PPpp')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {broadcast.status || 'Sent'} {/* Display status or default */}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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
