
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../types";

/**
 * Fetches a lead by its ID
 */
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  if (!leadId) return null;
  
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching lead:', error);
      return null;
    }
    
    if (!data) return null;
    
    // Create a properly typed Lead object with all properties explicitly cast
    const lead: Lead = {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      updated_at: data.updated_at || undefined,
      user_id: data.user_id,
      pipeline_stage_id: data.pipeline_stage_id || null,
      customer_id: data.customer_id || null,
      value: data.value || null,
      company_name: data.company_name || null,
      company_address: data.company_address || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      contact_first_name: data.contact_first_name || null
    };
    
    return lead;
  } catch (error) {
    console.error('Error in fetchLeadById:', error);
    return null;
  }
}

/**
 * Fetches a lead associated with a conversation
 */
export async function fetchLeadByConversation(conversationId: string): Promise<Lead | null> {
  if (!conversationId) return null;
  
  try {
    // First get the conversation to find its lead_id
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('lead_id')
      .eq('conversation_id', conversationId)
      .maybeSingle();
    
    if (error || !conversation?.lead_id) {
      console.log('No lead associated with this conversation:', conversationId);
      return null;
    }
    
    return fetchLeadById(conversation.lead_id);
  } catch (error) {
    console.error('Error in fetchLeadByConversation:', error);
    return null;
  }
}

/**
 * Fetches all tags for a lead
 */
export async function fetchLeadTags(leadId: string): Promise<string[]> {
  if (!leadId) return [];
  
  try {
    console.log('Fetching tags for lead:', leadId);
    const { data, error } = await supabase
      .from('lead_tags')
      .select('tag:tags(name)')
      .eq('lead_id', leadId);
      
    if (error) {
      console.error('Error fetching lead tags:', error);
      return [];
    }
    
    return data.map(item => item.tag.name);
  } catch (error) {
    console.error('Error in fetchLeadTags:', error);
    return [];
  }
}

/**
 * Adds a tag to a lead
 */
export async function addTagToLead(leadId: string, tagName: string): Promise<boolean> {
  if (!leadId || !tagName) {
    console.error('Missing leadId or tagName in addTagToLead:', { leadId, tagName });
    return false;
  }
  
  try {
    console.log('Adding tag to lead:', { leadId, tagName });
    
    // First, get or create the tag
    let tagId: string;
    const { data: existingTag, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .maybeSingle();
      
    if (tagError) {
      console.error('Error checking for existing tag:', tagError);
      return false;
    }
    
    if (existingTag) {
      tagId = existingTag.id;
      console.log('Found existing tag:', tagId);
    } else {
      // Create a new tag
      const { data: newTag, error: createError } = await supabase
        .from('tags')
        .insert({ name: tagName })
        .select('id')
        .maybeSingle();
        
      if (createError || !newTag) {
        console.error('Error creating new tag:', createError);
        return false;
      }
      
      tagId = newTag.id;
      console.log('Created new tag:', tagId);
    }
    
    // Now create the lead_tag association
    console.log('Creating lead_tag association:', { leadId, tagId });
    const { error: linkError } = await supabase
      .from('lead_tags')
      .insert({
        lead_id: leadId,
        tag_id: tagId
      });
      
    if (linkError) {
      // If it's a duplicate, that's fine
      if (linkError.code === '23505') { // Unique violation
        console.log('Tag already associated with lead (duplicate)');
        return true;
      }
      console.error('Error adding tag to lead:', linkError);
      return false;
    }
    
    console.log('Successfully added tag to lead');
    return true;
  } catch (error) {
    console.error('Error in addTagToLead:', error);
    return false;
  }
}

/**
 * Removes a tag from a lead
 */
export async function removeTagFromLead(leadId: string, tagName: string): Promise<boolean> {
  if (!leadId || !tagName) {
    console.error('Missing leadId or tagName in removeTagFromLead:', { leadId, tagName });
    return false;
  }
  
  try {
    console.log('Removing tag from lead:', { leadId, tagName });
    
    // First, get the tag ID
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .maybeSingle();
      
    if (tagError || !tag) {
      console.error('Error finding tag:', tagError);
      return false;
    }
    
    console.log('Found tag to remove:', tag.id);
    
    // Now remove the association
    const { error: removeError } = await supabase
      .from('lead_tags')
      .delete()
      .eq('lead_id', leadId)
      .eq('tag_id', tag.id);
      
    if (removeError) {
      console.error('Error removing tag from lead:', removeError);
      return false;
    }
    
    console.log('Successfully removed tag from lead');
    return true;
  } catch (error) {
    console.error('Error in removeTagFromLead:', error);
    return false;
  }
}
