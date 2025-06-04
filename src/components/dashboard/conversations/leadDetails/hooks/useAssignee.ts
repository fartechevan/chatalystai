
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Lead, Customer } from "../../types"; // Import Customer
import { useToast } from "@/hooks/use-toast";

export function useAssignee(profiles: Profile[], lead: Lead | null, customer?: Customer | null) { // Add optional customer param
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize the selected assignee based on the lead's user_id
  useEffect(() => {
    // Set assignee based on lead's user_id, otherwise null
    setSelectedAssignee(lead?.user_id || null); 
  }, [lead?.user_id]); // Only depend on lead.user_id for initialization

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
