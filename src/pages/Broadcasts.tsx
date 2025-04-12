import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BroadcastModal } from "@/components/dashboard/conversations/BroadcastModal";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns'; // For formatting dates

// Define the type for a broadcast record (adjust based on your table structure)
interface Broadcast {
  id: string;
  message_text: string;
  created_at: string;
  // Add other relevant fields like instance_id if needed
}

const BroadcastsPage = () => {
  const navigate = useNavigate(); // Get navigate function
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const handleCloseModal = () => setIsModalOpen(false);

  const handleViewDetails = (broadcastId: string) => {
    navigate(`/dashboard/broadcasts/${broadcastId}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Broadcast History</h1>
        <Button onClick={handleOpenModal}>New Broadcast</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading broadcast history...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && broadcasts.length === 0 && (
            <p>No broadcast messages sent yet.</p>
          )}
          {!isLoading && !error && broadcasts.length > 0 && (
            <ul className="space-y-4">
              {broadcasts.map((broadcast) => (
                <li 
                  key={broadcast.id} 
                  className="border p-4 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => handleViewDetails(broadcast.id)} // Add onClick handler
                >
                  <p className="font-medium truncate">{broadcast.message_text}</p>
                  <p className="text-sm text-muted-foreground">
                    Sent on: {format(new Date(broadcast.created_at), 'PPpp')} 
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Modal */}
      <BroadcastModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default BroadcastsPage;
