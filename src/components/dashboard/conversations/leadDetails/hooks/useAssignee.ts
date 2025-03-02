
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Lead } from "../../types";
import { useToast } from "@/hooks/use-toast";

export function useAssignee(profiles: Profile[], lead: Lead | null) {
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize the selected assignee based on the lead
  useEffect(() => {
    if (lead?.user_id) {
      setSelectedAssignee(lead.user_id);
    } else if (profiles.length > 0) {
      setSelectedAssignee(profiles[0].id);
    }
  }, [lead?.user_id, profiles]);

  const handleAssigneeChange = async (userId: string) => {
    setSelectedAssignee(userId);
    
    if (!lead || !lead.id) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ user_id: userId })
        .eq('id', lead.id);
      
      if (error) {
        console.error('Error updating lead assignee:', error);
        toast({
          title: "Error",
          description: "Failed to update lead assignee",
          variant: "destructive"
        });
      } else {
        console.log(`Updated lead ${lead.id} assignee to ${userId}`);
        
        const profileName = profiles.find(p => p.id === userId)?.name || "Selected user";
        toast({
          title: "Success",
          description: `Lead assigned to ${profileName}`,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      } else if (data) {
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }, []);

  return {
    selectedAssignee,
    handleAssigneeChange,
    fetchProfiles
  };
}
