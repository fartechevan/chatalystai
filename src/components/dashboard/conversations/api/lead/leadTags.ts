
import { supabase } from "@/integrations/supabase/client";

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Fetches all tags for a lead
 */
export async function fetchLeadTags(leadId: string): Promise<string[]> {
  if (!leadId || !isValidUUID(leadId)) {
    console.error('Invalid or missing lead ID in fetchLeadTags:', leadId);
    return [];
  }
  
  try {
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
  if (!tagName.trim()) {
    console.error('Tag name is empty');
    return false;
  }
  
  if (!leadId || !isValidUUID(leadId)) {
    console.error('Invalid lead ID format in addTagToLead:', leadId);
    return false;
  }
  
  try {
    
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
    }
    
    // Now create the lead_tag association
    const { error: linkError } = await supabase
      .from('lead_tags')
      .insert({
        lead_id: leadId,
        tag_id: tagId
      });
      
    if (linkError) {
      // If it's a duplicate, that's fine
      if (linkError.code === '23505') { // Unique violation
        return true;
      }
      console.error('Error adding tag to lead:', linkError);
      return false;
    }
    
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
  if (!tagName.trim()) {
    console.error('Tag name is empty');
    return false;
  }
  
  if (!leadId || !isValidUUID(leadId)) {
    console.error('Invalid lead ID format in removeTagFromLead:', leadId);
    return false;
  }
  
  try {
    
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
    
    return true;
  } catch (error) {
    console.error('Error in removeTagFromLead:', error);
    return false;
  }
}
