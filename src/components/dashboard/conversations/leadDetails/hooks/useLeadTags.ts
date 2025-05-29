
import { useState, useEffect } from "react";
import { Lead } from "../../types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchLeadTags, addTagToLead, removeTagFromLead } from "../../api/lead/leadTags";

export function useLeadTags(lead: Lead | null) {
  const [tags, setTags] = useState<string[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState(false);
  const { toast } = useToast();

  const loadLeadTags = async (leadId: string) => {
    if (!leadId) return;
    
    setIsTagsLoading(true);
    try {
      const tagNames = await fetchLeadTags(leadId);
      setTags(tagNames);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsTagsLoading(false);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!tag.trim() || !lead?.id) return;
    
    try {
      const success = await addTagToLead(lead.id, tag.trim());
      
      if (success) {
        // Optimistically update the UI
        setTags(prev => [...prev, tag.trim()]);
        
        toast({
          title: "Tag added",
          description: `Added "${tag.trim()}" tag to lead`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add tag",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead?.id) return;
    
    try {
      const success = await removeTagFromLead(lead.id, tagToRemove);
      
      if (success) {
        // Optimistically update the UI
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
        
        toast({
          title: "Tag removed",
          description: `Removed "${tagToRemove}" tag from lead`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove tag",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (lead?.id) {
      loadLeadTags(lead.id);
    } else {
      setTags([]);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (!lead?.id) return;

    const leadTagsChannel = supabase
      .channel('lead-tags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_tags'
        },
        (payload) => {
          // Only refresh if it's our current lead
          if (lead?.id && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new && payload.new.lead_id === lead.id) {
            loadLeadTags(lead.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadTagsChannel);
    };
  }, [lead?.id]);

  return {
    tags,
    setTags,
    isTagsLoading,
    handleAddTag,
    handleRemoveTag
  };
}
