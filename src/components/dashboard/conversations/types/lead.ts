
export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  value: number | null;
  pipeline_stage_id: string | null;
  user_id: string;
  assignee_id?: string | null;
  tags?: { id: string; name: string }[] | null; // Add tags field
  
  // Virtual properties derived from customer data
  company_name?: string;
  
  // Additional properties used in ConversationUserDetails
  contact_email?: string;
  contact_phone?: string;
  company_address?: string;
  
  // Names from customer for backwards compatibility
  name?: string; // Customer name from the customers table

  // Derived/Mapped properties for UI convenience
  stage_name?: string; // Name of the pipeline stage
  pipeline_id?: string | null; // ID of the pipeline the lead is in (for list view filtering)
}
