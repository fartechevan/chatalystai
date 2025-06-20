import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePageActionContext } from '@/context/PageActionContext'; // Import context
import { Button } from '@/components/ui/button'; // For Create Contact button
import { Input } from '@/components/ui/input'; // For Search input
import { PlusCircle } from 'lucide-react'; // Icon for Create Contact
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import { ContactsDataTable } from '@/components/contacts/list/ContactsDataTable';
// import { columns, ContactEntry } from '@/components/contacts/list/columns'; // Will be replaced by getColumns
import { getColumns, ContactEntry } from '@/components/contacts/list/columns'; // Import getColumns
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog'; // Import the dialog
import { EditContactDialog } from '@/components/contacts/EditContactDialog'; // Import the Edit dialog
import { ViewContactDialog } from '@/components/contacts/ViewContactDialog'; // Import the View dialog

// Define JsonValue type locally
type JsonPrimitive = string | number | boolean | null;
interface JsonObject { [key: string]: JsonValue | undefined; }
type JsonArray = JsonValue[]; // Changed from interface to type alias
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Define a type for your customer data based on your 'customers' table
// This should match the columns you expect from the 'customers' table, map to ContactEntry for DataTable
export type Customer = { 
  // This type is from the DB
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  company_name: string | null;
  company_address: string | null;
  created_at: string;
  updated_at: string;
  metadata: JsonValue | null;
};

const ContactsPage: React.FC = () => {
  const { setPrimaryAction, setSecondaryActionNode } = usePageActionContext();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]); // Raw data from Supabase
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for TanStack Table
  const [globalFilter, setGlobalFilter] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false); // State for create dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // State for edit dialog
  const [editingContact, setEditingContact] = useState<ContactEntry | null>(null); // Contact to edit
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false); // State for view dialog
  const [viewingContact, setViewingContact] = useState<ContactEntry | null>(null); // Contact to view
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // const { setPrimaryAction, setSecondaryActionNode } = usePageActionContext(); // This was the duplicate, remove it. Already declared above.

  const handleOpenEditDialog = (contact: ContactEntry) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleOpenViewDialog = (contact: ContactEntry) => {
    setViewingContact(contact);
    setIsViewDialogOpen(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .match({ id: contactId });

      if (deleteError) {
        throw deleteError;
      }
      toast({
        title: 'Success',
        description: 'Contact deleted successfully.',
      });
      fetchCustomers(); // Refresh the list
    } catch (err) {
      let errorMessage = 'Failed to delete contact.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error deleting contact:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    // Define header actions
    setPrimaryAction({
      id: 'create-contact',
      label: 'Create Contact',
      icon: PlusCircle,
      action: () => {
        setIsCreateDialogOpen(true); // Open the dialog
      },
    });

    setSecondaryActionNode(
      <Input
        placeholder="Search contacts..."
        value={globalFilter}
        onChange={(event) => setGlobalFilter(event.target.value)}
        className="w-full md:w-[300px]" // Adjust width as needed
      />
    );

    // Cleanup actions on component unmount
    return () => {
      setPrimaryAction(null);
      setSecondaryActionNode(null);
    };
  }, [setPrimaryAction, setSecondaryActionNode]);

  // Function to fetch customers, can be called on mount and after create
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .select('*');

      if (supabaseError) {
        throw supabaseError;
      }
      setAllCustomers((data || []) as Customer[]);
    } catch (err) {
      let errorMessage = 'Failed to fetch customers.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error fetching customers:', err);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []); // Initial fetch

  const handleCreateSuccess = () => {
    fetchCustomers(); // Refetch data on successful creation
    // Dialog is closed by itself from within CreateContactDialog
  };

  const handleEditSuccess = () => {
    fetchCustomers(); // Refetch data on successful update
    setIsEditDialogOpen(false); // Close dialog
    setEditingContact(null);
  };

  // Map Customer data to ContactEntry for DataTable
  const tableData: ContactEntry[] = useMemo(() => 
    allCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone_number: customer.phone_number,
      company_name: customer.company_name,
      // Ensure all fields required by ContactEntry or columns are mapped
    })), [allCustomers]);

  // Generate columns with the delete handler
  const columns = useMemo(
    () => getColumns(handleDeleteContact, handleOpenEditDialog, handleOpenViewDialog),
    [handleDeleteContact, handleOpenEditDialog, handleOpenViewDialog]
  );

  const table = useReactTable({
    data: tableData,
    columns, // Use the dynamically generated columns
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter, // For global search input
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // For column and global filtering
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // For faceted filtering if used
    getFacetedUniqueValues: getFacetedUniqueValues(), // For faceted filtering
  });

  if (loading) {
    return <div className="p-4">Loading contacts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <ContactsDataTable columns={columns} table={table} />
      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
      {editingContact && (
        <EditContactDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
          contactData={editingContact}
        />
      )}
      {viewingContact && (
        <ViewContactDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          contactData={viewingContact}
        />
      )}
    </div>
  );
};

export default ContactsPage;
