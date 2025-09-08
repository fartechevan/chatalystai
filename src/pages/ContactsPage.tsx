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
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingContact, setViewingContact] = useState<ContactEntry | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .select('*');
      if (supabaseError) throw supabaseError;
      setAllCustomers((data || []) as Customer[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch customers.';
      console.error('Error fetching customers:', err);
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tableData: ContactEntry[] = useMemo(() =>
    allCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone_number: customer.phone_number,
      company_name: customer.company_name,
    })), [allCustomers]);

  const handleOpenEditDialog = (contact: ContactEntry) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleOpenViewDialog = (contact: ContactEntry) => {
    setViewingContact(contact);
    setIsViewDialogOpen(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this contact? This will also delete associated appointments, leads, and conversation participants.')) return;
    try {
      // Delete from referencing tables first
      const { error: appointmentsError } = await supabase.from('appointments').delete().eq('customer_id', contactId);
      if (appointmentsError) throw new Error(`Failed to delete appointments: ${appointmentsError.message}`);

      const { error: convError } = await supabase.from('conversation_participants').delete().eq('customer_id', contactId);
      if (convError) throw new Error(`Failed to delete conversation participants: ${convError.message}`);

      const { error: leadsError } = await supabase.from('leads').delete().eq('customer_id', contactId);
      if (leadsError) throw new Error(`Failed to delete leads: ${leadsError.message}`);

      const { error: broadcastError } = await supabase.from('broadcast_recipients').delete().eq('customer_id', contactId);
      if (broadcastError) throw new Error(`Failed to delete broadcast recipients: ${broadcastError.message}`);

      const { error: segmentError } = await supabase.from('segment_contacts').delete().eq('contact_id', contactId);
      if (segmentError) throw new Error(`Failed to delete segment contacts: ${segmentError.message}`);

      // Now delete from customers table
      const { error: deleteError } = await supabase.from('customers').delete().match({ id: contactId });
      if (deleteError) throw deleteError;
      
      toast({ title: 'Success', description: 'Contact deleted successfully.' });
      fetchCustomers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete contact.';
      console.error('Error deleting contact:', err);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const columns = useMemo(
    () => getColumns(handleDeleteContact, handleOpenEditDialog, handleOpenViewDialog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: tableData,
    columns,
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
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleDeleteSelectedContacts = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const idsToDelete = selectedRows.map((row) => row.original.id);
    if (idsToDelete.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${idsToDelete.length} contact(s)? This will also delete associated data like leads and conversation participants.`)) return;

    try {
      // Delete from referencing tables first
      const { error: convError } = await supabase.from('conversation_participants').delete().in('customer_id', idsToDelete);
      if (convError) throw new Error(`Failed to delete conversation participants: ${convError.message}`);

      const { error: leadsError } = await supabase.from('leads').delete().in('customer_id', idsToDelete);
      if (leadsError) throw new Error(`Failed to delete leads: ${leadsError.message}`);

      const { error: broadcastError } = await supabase.from('broadcast_recipients').delete().in('customer_id', idsToDelete);
      if (broadcastError) throw new Error(`Failed to delete broadcast recipients: ${broadcastError.message}`);

      const { error: segmentError } = await supabase.from('segment_contacts').delete().in('contact_id', idsToDelete);
      if (segmentError) throw new Error(`Failed to delete segment contacts: ${segmentError.message}`);

      // Now delete from customers table
      const { error: deleteError } = await supabase.from('customers').delete().in('id', idsToDelete);
      if (deleteError) throw deleteError;
      
      toast({ title: 'Success', description: `${idsToDelete.length} contact(s) deleted successfully.` });
      fetchCustomers();
      table.resetRowSelection();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete contacts.';
      console.error('Error deleting contacts:', err);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  }, [table, fetchCustomers]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setPrimaryAction({
      id: 'create-contact',
      label: 'Create Contact',
      icon: PlusCircle,
      action: () => setIsCreateDialogOpen(true),
    });
    return () => setPrimaryAction(null);
  }, [setPrimaryAction]);

  useEffect(() => {
    const numSelected = table.getFilteredSelectedRowModel().rows.length;
    setSecondaryActionNode(
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search contacts..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="w-full md:w-[300px]"
        />
        {numSelected > 0 && (
          <Button
            variant="destructive"
            onClick={handleDeleteSelectedContacts}
          >
            Delete ({numSelected})
          </Button>
        )}
      </div>
    );
    return () => setSecondaryActionNode(null);
  }, [globalFilter, rowSelection, setSecondaryActionNode, handleDeleteSelectedContacts]);

  const handleCreateSuccess = () => {
    fetchCustomers();
  };

  const handleEditSuccess = () => {
    fetchCustomers();
    setIsEditDialogOpen(false);
    setEditingContact(null);
  };

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
