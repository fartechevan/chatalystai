
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = 'user' | 'admin';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export function UserRoleManager({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserRole;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: AppRole) => {
      setIsUpdating(true);
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: newRole }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role', userId] });
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Select
      defaultValue={userRole?.role || 'user'}
      disabled={isUpdating}
      onValueChange={(value: AppRole) => {
        updateRoleMutation.mutate(value);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">User</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
