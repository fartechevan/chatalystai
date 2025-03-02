
import { supabase } from "@/integrations/supabase/client";

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
