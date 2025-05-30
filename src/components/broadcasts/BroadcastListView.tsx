import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom'; // Import useOutletContext
import { Button } from "@/components/ui/button";
// Input is no longer directly used in this component's render
// import { Input } from "@/components/ui/input"; 
import type { PageHeaderContextType } from '@/components/dashboard/DashboardLayout'; // Import context type
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js"; // Import PostgrestError
import { BroadcastModal } from "@/components/dashboard/conversations/BroadcastModal";
import { getBroadcastColumns } from "./list/columns"; // Import columns
import { BroadcastDataTable } from "./list/BroadcastDataTable"; // Import DataTable
import { PlusCircle } from 'lucide-react'; // Icon for Create button

// Define the type for a broadcast record (can be moved to a types file)
export interface Broadcast {
  id: string;
  name?: string; // Name might not exist directly on the table
  message_text: string;
  created_at: string;
  status?: 'draft' | 'scheduled' | 'sent' | 'failed' | 'cancelled'; // Status might not exist or have different values
  scheduled_at?: string | null;
  recipient_count?: number; // recipient_count might not exist
  // Add other relevant fields from your actual 'broadcasts' table schema
  instance_id?: string; // Example: if your table has this
  integration_id?: string; // Example: if your table has this
}

interface BroadcastFilters {
  status?: string[];
  scheduled_at_start?: string;
  scheduled_at_end?: string;
  // Add other filter properties as needed
}

// Mock data for now - replace with API call
const fetchBroadcastsFromAPI = async (page: number, pageSize: number, searchTerm: string, filters: BroadcastFilters): Promise<{ data: Broadcast[], totalCount: number }> => {
  // Simulate API call
  console.log(`Fetching broadcasts: page=${page}, pageSize=${pageSize}, search=${searchTerm}, filters=`, filters);
  
  // Basic Supabase query (will need to be enhanced for actual pagination and filtering)
  // Select only columns that are known to exist or are essential.
  // All other fields in the `Broadcast` interface will be populated with defaults.
  const selectColumns = 'id, message_text, created_at'; 
  let query = supabase
    .from('broadcasts')
    .select(selectColumns, { count: 'exact' }) // Request total count
    .order('created_at', { ascending: false });

  if (searchTerm) {
    query = query.ilike('message_text', `%${searchTerm}%`); // or 'name'
  }

  // Apply status filter if present
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  
  // Apply date range filter if present (example, needs date-fns or similar for actual date comparison)
  // if (filters.scheduled_at_start && filters.scheduled_at_end) {
  //   query = query.gte('scheduled_at', filters.scheduled_at_start);
  //   query = query.lte('scheduled_at', filters.scheduled_at_end);
  // }

  // Type the response from Supabase more accurately
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error("Error fetching broadcasts:", error);
    // Ensure the error object is properly handled if it's a PostgrestError or a generic Error
    const errorMessage = (error as PostgrestError)?.message || (error as Error)?.message || "Unknown error fetching broadcasts";
    return { data: [], totalCount: 0 };
  }

  // The 'data' from Supabase with an explicit select should be closer to our Broadcast type,
  // but we still map to ensure defaults and structure for all fields in our `Broadcast` interface.
  
  // Define a type for the items we expect directly from the DB based on `selectColumns`
  // This type represents the minimal structure we rely on from the database.
  type DbBroadcastItem = {
    id: string;
    message_text: string;
    created_at: string;
    // Allow any other properties that might come from the DB item
    [key: string]: any; 
  };

  // Force a break in TypeScript's inference chain by casting through unknown.
  const supabaseData = data as unknown as DbBroadcastItem[] | null;

  const formattedData = (supabaseData || []).map((item: DbBroadcastItem): Broadcast => {
    // Construct the full Broadcast object, providing defaults for fields.
    return {
      id: item.id, 
      message_text: item.message_text, 
      created_at: item.created_at, 
      name: item.name || `Broadcast ${item.id.substring(0, 4)}`,
      status: item.status || 'draft',
      recipient_count: typeof item.recipient_count === 'number' ? item.recipient_count : 0,
      scheduled_at: item.scheduled_at || null,
      instance_id: item.instance_id || undefined,
      integration_id: item.integration_id || undefined,
    };
  });

  return { data: formattedData, totalCount: count || 0 };
};


const BroadcastListView = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  // Add other filters like date range if needed

  const [messageToDuplicate, setMessageToDuplicate] = useState<string | null>(null);

  useEffect(() => {
    const loadBroadcasts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = { status: statusFilter /*, other filters */ };
        const { data, totalCount: fetchedTotalCount } = await fetchBroadcastsFromAPI(page, pageSize, searchTerm, filters);
        setBroadcasts(data);
        setTotalCount(fetchedTotalCount);
      } catch (err: unknown) {
        console.error("Error loading broadcasts:", err);
        const message = err instanceof Error ? err.message : "Failed to load broadcasts.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadBroadcasts();
  }, [page, pageSize, searchTerm, statusFilter]); // Re-fetch when pagination, search, or filters change

  const handleOpenModal = (initialMessage?: string) => {
    setMessageToDuplicate(initialMessage || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMessageToDuplicate(null);
  };

  const handleViewDetails = (broadcastId: string) => {
    navigate(`/dashboard/broadcasts/${broadcastId}`);
  };
  
  const pageCount = Math.ceil(totalCount / pageSize);

  // Memoize columns to prevent re-creation on every render
  const columns = useMemo(
    () => getBroadcastColumns({ 
      onViewDetails: handleViewDetails, 
      onDuplicate: (msg: string) => handleOpenModal(msg) 
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    [navigate] // Assuming handleViewDetails and handleOpenModal are stable or memoized
    // If handleOpenModal depends on messageToDuplicate, it might need more complex memoization or be defined inside useEffect
  );

  const outletContext = useOutletContext<PageHeaderContextType | undefined>();

  useEffect(() => {
    if (outletContext?.setHeaderActions) {
      const actions = (
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Broadcast
        </Button>
      );
      outletContext.setHeaderActions(actions);
    }
    // Cleanup function to remove actions when component unmounts
    return () => {
      if (outletContext?.setHeaderActions) {
        outletContext.setHeaderActions(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletContext?.setHeaderActions]); // Rerun if setHeaderActions changes (should be stable)
  // handleOpenModal should be stable or memoized if included in deps

  return (
    <div className="h-full flex-1 flex-col space-y-8 md:flex"> {/* Removed p-8, parent main has padding */}
      {/* Header section (title and Create button) is now removed from here and handled by DashboardLayout */}
      
      {isLoading && <div className="pt-6 text-center"><p>Loading broadcasts...</p></div>}
      {error && <div className="pt-6 text-center"><p className="text-red-500">{error}</p></div>}
      
      {!isLoading && !error && (
        <BroadcastDataTable
          columns={columns}
          data={broadcasts}
          pageCount={pageCount}
          pageIndex={page - 1} // DataTable is 0-indexed for pageIndex
          pageSize={pageSize}
          onPageChange={(newPageIndex) => setPage(newPageIndex + 1)} // Adjust back to 1-indexed for our state
          onPageSizeChange={setPageSize}
          totalItems={totalCount}
        />
      )}
      {!isLoading && !error && broadcasts.length === 0 && totalCount === 0 && (
         <div className="p-6 text-center"><p>No broadcasts found. Create one to get started!</p></div>
      )}


      <BroadcastModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialMessage={messageToDuplicate ?? undefined}
      />
    </div>
  );
};

export default BroadcastListView;
