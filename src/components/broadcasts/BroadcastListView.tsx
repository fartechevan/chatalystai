import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom'; // Import useOutletContext
import { Button } from "@/components/ui/button";
// Input is no longer directly used in this component's render
// import { Input } from "@/components/ui/input"; 
import type { PageHeaderContextType } from '@/components/dashboard/DashboardLayout'; // Import context type
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js"; // Import PostgrestError
import { BroadcastModal } from "@/components/dashboard/conversations/BroadcastModal";
import { getBroadcastColumns, statuses } from "./list/columns"; // Import columns and statuses
import { BroadcastDataTable } from "./list/BroadcastDataTable"; // Import DataTable
import { BroadcastTableToolbar } from "./list/BroadcastTableToolbar"; // Import Toolbar
import { PlusCircle } from 'lucide-react'; // Icon for Create button
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter"; // Import Faceted Filter
import { Cross2Icon } from "@radix-ui/react-icons"; // Import Reset Icon
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type ColumnDef, // Import ColumnDef
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Table, // Import Table type
} from "@tanstack/react-table";

// Define the type for a broadcast record (can be moved to a types file)
export interface Broadcast {
  id: string;
  name?: string; // Name might not exist directly on the table
  message_text: string;
  created_at: string;
  status?: 'draft' | 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'pending' | 'completed' | 'partial_completion'; // Updated status types
  recipient_count?: number; // recipient_count might not exist
  // Add other relevant fields from your actual 'broadcasts' table schema
  instance_id?: string;
  integration_id?: string; 
  senderDisplayName?: string; // To store instance_display_name
}

interface BroadcastFilters {
  status?: string[];
  // Add other filter properties as needed
}

// Mock data for now - replace with API call
const fetchBroadcastsFromAPI = async (page: number, pageSize: number, searchTerm: string, filters: BroadcastFilters): Promise<{ data: Broadcast[], totalCount: number }> => {
  // Simulate API call
  console.log(`Fetching broadcasts: page=${page}, pageSize=${pageSize}, search=${searchTerm}, filters=`, filters);
  
  // Basic Supabase query (will need to be enhanced for actual pagination and filtering)
  // Select necessary columns including those for linking to integration_config
  // and the actual status from the broadcasts table.
  const selectColumns = 'id, message_text, created_at, integration_id, instance_id, status'; 
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
  
  // Type the response from Supabase more accurately
  // Define the type for items directly from Supabase based on selectColumns
  type ExactSupabaseDataItem = {
    id: string;
    message_text: string;
    created_at: string;
    integration_id?: string | null;
    instance_id?: string | null;
    status?: string | null; // Added status here
    // recipient_count is not a direct column.
    // It will be defaulted or derived later if needed.
  };

  // Define an interface for the expected shape of the Supabase query response
  interface SupabaseQueryResponse<T> {
    data: T[] | null;
    error: PostgrestError | null;
    count: number | null;
    status: number; 
    statusText: string; 
  }

  // Let Supabase infer the types from the query as much as possible.
  // The .select() method in Supabase client is generic and should provide good inference.
  // Using @ts-expect-error to suppress persistent "Type instantiation is excessively deep" error from Supabase query.
  const queryResponse: SupabaseQueryResponse<ExactSupabaseDataItem> = await query.range((page - 1) * pageSize, page * pageSize - 1);

  // Access parts from the explicitly typed queryResponse
  const supabaseDataResult = queryResponse.data;
  const responseError = queryResponse.error; // Renamed to avoid conflict with outer scope 'error' state
  const count = queryResponse.count;


  if (responseError) {
    console.error("Error fetching broadcasts:", responseError);
    const typedError = responseError as PostgrestError | Error; // Keep this for error handling
    const errorMessage = typedError.message || "Unknown error fetching broadcasts";
    return { data: [], totalCount: 0 };
  }

  // Explicitly cast the data to the expected raw type.
  // supabaseDataResult is already typed as ExactSupabaseDataItem[] | null
  const rawItems = supabaseDataResult;

  if (!rawItems) {
    return { data: [], totalCount: 0 };
  }

  // Fetch all integration_config entries to map instance_display_name
  const { data: integrationConfigs, error: integrationConfigsError } = await supabase
    .from('integrations_config')
    .select('instance_id, instance_display_name');

  if (integrationConfigsError) {
    console.error("Error fetching integration configs:", integrationConfigsError);
    // Proceed without display names or handle error more gracefully
  }

  const configMap = new Map<string, string>();
  if (integrationConfigs) {
    integrationConfigs.forEach(config => {
      if (config.instance_id && config.instance_display_name) {
        configMap.set(config.instance_id, config.instance_display_name);
      }
    });
  }

  const formattedData = rawItems.map((item: ExactSupabaseDataItem): Broadcast => {
    let displayName = 'Unknown Sender (no instance_id from broadcast)';
    if (item.instance_id) {
      const mappedName = configMap.get(item.instance_id);
      if (mappedName) {
        displayName = mappedName; // Successfully mapped from integrations_config.instance_display_name
      } else {
        displayName = `Unmapped Instance ID: ${item.instance_id}`; // instance_id from broadcast not found in integrations_config
      }
    }

    return {
      id: item.id,
      message_text: item.message_text,
      created_at: item.created_at,
      name: `Broadcast ${item.id.substring(0, 4)}`, // Default name, consider removing if not used
      status: (item.status || 'pending') as NonNullable<Broadcast['status']>, // Use actual status, ensure it fits the updated Broadcast['status'] type
      recipient_count: 0, // This likely needs to be calculated or fetched differently if required
      instance_id: item.instance_id || undefined,
      integration_id: item.integration_id || undefined,
      senderDisplayName: displayName,
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

  // React Table state lifted from BroadcastDataTable
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  useEffect(() => {
    const loadBroadcasts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = { status: statusFilter /*, other filters */ };
        const { data, totalCount: fetchedTotalCount } = await fetchBroadcastsFromAPI(page, pageSize, searchTerm, filters);
        setBroadcasts(data);
        setTotalCount(fetchedTotalCount);
      } catch (err) { // err is unknown by default
        console.error("Error loading broadcasts:", err);
        let message = "Failed to load broadcasts.";
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        }
        // Can add more specific checks for PostgrestError if needed
        // else if (err && typeof err === 'object' && 'message' in err) {
        //   message = String((err as { message: unknown }).message);
        // }
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
  const columns: ColumnDef<Broadcast>[] = useMemo( // Added type for columns
    () => getBroadcastColumns({
      onViewDetails: handleViewDetails,
      onDuplicate: (msg: string) => handleOpenModal(msg)
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate]
  );

  const table: Table<Broadcast> = useReactTable({ // Explicitly type the table instance
    data: broadcasts,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex: page - 1, // DataTable is 0-indexed
        pageSize: pageSize,
      },
    },
    pageCount: pageCount,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualFiltering: true, // Assuming server-side filtering or controlled filtering
    manualSorting: true, // Assuming server-side sorting or controlled sorting
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPaginationState = updater({ pageIndex: page - 1, pageSize: pageSize });
        setPage(newPaginationState.pageIndex + 1);
        setPageSize(newPaginationState.pageSize);
      } else {
        setPage(updater.pageIndex + 1);
        setPageSize(updater.pageSize);
      }
    },
  });


  const outletContext = useOutletContext<PageHeaderContextType | undefined>();

  useEffect(() => {
    if (outletContext?.setHeaderActions && table) { // Ensure table is initialized
      const isFiltered = table.getState().columnFilters.length > 0;
      const actions = (
        <div className="flex items-center space-x-2">
          {/* BroadcastTableToolbar now only contains search and view options */}
          <BroadcastTableToolbar table={table as Table<Broadcast>} /> 
          
          {/* Moved Status Filter and Reset Button here */}
          {table.getColumn("status") && (
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title="Status"
              options={statuses.map(status => ({ label: status.label, value: status.value }))}
            />
          )}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
          )}

          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Broadcast
          </Button>
        </div>
      );
      outletContext.setHeaderActions(actions);
    }
    return () => {
      if (outletContext?.setHeaderActions) {
        outletContext.setHeaderActions(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletContext?.setHeaderActions, table, handleOpenModal, columnFilters, sorting, rowSelection, columnVisibility]); // Removed handleCreateLead from dependencies

  return (
    <div className="h-full flex-1 flex-col space-y-8 md:flex"> {/* Removed p-8, parent main has padding */}
      {isLoading && <div className="pt-6 text-center"><p>Loading broadcasts...</p></div>}
      {error && <div className="pt-6 text-center"><p className="text-red-500">{error}</p></div>}
      
      {!isLoading && !error && (
        <BroadcastDataTable
          table={table as Table<Broadcast>} // Pass table instance
          columns={columns} // Pass columns for colSpan
          // data, pageCount, pageIndex, pageSize, onPageChange, onPageSizeChange are now part of the table instance
          totalItems={totalCount} // Pass totalItems for pagination display
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
