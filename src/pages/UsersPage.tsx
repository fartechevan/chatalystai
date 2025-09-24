import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePageActionContext } from '@/context/PageActionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
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

import { UsersDataTable } from '@/components/users/UsersDataTable';
import { getColumns, Profile } from '@/components/users/columns';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';

const UsersPage: React.FC = () => {
  const { setPrimaryAction, setSecondaryActionNode } = usePageActionContext();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('profiles')
        .select('*');
      if (supabaseError) throw supabaseError;
      setUsers((data || []) as Profile[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users.';
      console.error('Error fetching users:', err);
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (user: Profile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      toast({ title: 'Success', description: 'User deleted successfully.' });
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user.';
      console.error('Error deleting user:', err);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const columns = useMemo(
    () => getColumns(handleDeleteUser, handleOpenEditDialog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: users,
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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setPrimaryAction({
      id: 'invite-user',
      label: 'Invite User',
      icon: PlusCircle,
      action: () => setShowInviteMemberModal(true),
    });
    return () => setPrimaryAction(null);
  }, [setPrimaryAction]);

  const handleDeleteSelectedUsers = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const idsToDelete = selectedRows.map((row) => row.original.id);
    if (idsToDelete.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${idsToDelete.length} user(s)?`)) return;

    try {
      const { error } = await supabase.from('profiles').delete().in('id', idsToDelete);
      if (error) throw error;
      
      toast({ title: 'Success', description: `${idsToDelete.length} user(s) deleted successfully.` });
      fetchUsers();
      table.resetRowSelection();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete users.';
      console.error('Error deleting users:', err);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  }, [table, fetchUsers]);

  useEffect(() => {
    const numSelected = table.getFilteredSelectedRowModel().rows.length;
    setSecondaryActionNode(
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search users..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="w-full md:w-[300px]"
        />
        {numSelected > 0 && (
          <Button
            variant="destructive"
            onClick={handleDeleteSelectedUsers}
          >
            Delete ({numSelected})
          </Button>
        )}
      </div>
    );
    return () => setSecondaryActionNode(null);
  }, [globalFilter, rowSelection, setSecondaryActionNode, handleDeleteSelectedUsers]);

  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  const handleEditSuccess = () => {
    fetchUsers();
    setIsEditDialogOpen(false);
    setEditingUser(null);
  };

  const handleInviteSuccess = () => {
    fetchUsers();
    setShowInviteMemberModal(false);
  };

  return (
    <div className="container mx-auto p-4">
      <UsersDataTable columns={columns} table={table} />
      <InviteUserDialog
        open={showInviteMemberModal}
        onOpenChange={setShowInviteMemberModal}
        onSuccess={handleInviteSuccess}
      />
      {editingUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
          userData={editingUser}
        />
      )}
    </div>
  );
};

export default UsersPage;
