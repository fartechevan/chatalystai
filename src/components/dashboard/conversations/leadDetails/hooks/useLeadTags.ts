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
      console.log('Adding tag to lead:', lead.id, tag.trim());
      const success = await addTagToLead(lead.id, tag.trim());
      
      if (success) {
        // Optimistically update the UI
        setTags(prev => [...prev, tag.trim()]);
        
        console.log(`Added tag ${tag.trim()} to lead ${lead.id}`);
        
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
      console.log('Removing tag from lead:', lead.id, tagToRemove);
      const success = await removeTagFromLead(lead.id, tagToRemove);
      
      if (success) {
        // Optimistically update the UI
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
        
        console.log(`Removed tag ${tagToRemove} from lead ${lead.id}`);
        
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
      console.log('Loading tags for lead:', lead.id);
      loadLeadTags(lead.id);
    } else {
      console.log('No lead ID available, clearing tags');
      setTags([]);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (!lead?.id) return;

    console.log('Setting up lead_tags realtime subscription for lead:', lead.id);
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
          console.log('Lead tags change detected:', payload);
          // Only refresh if it's our current lead
          if (lead?.id && payload.new && typeof payload.new === 'object' && 'lead_id' in payload.new && payload.new.lead_id === lead.id) {
            loadLeadTags(lead.id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up lead_tags subscription');
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
