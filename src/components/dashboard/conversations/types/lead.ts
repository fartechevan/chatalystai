
export interface Lead {
  id: string;
  created_at: string;
  updated_at?: string | undefined;
  pipeline_stage_id?: string | null;
  customer_id?: string | null;
  user_id: string;
  value?: number | null;
  
  // These fields will be populated from joined customer data or for UI purposes
  // but are not present in the database table itself
  name?: string | null; // Virtual property for display
  company_name?: string | null; // From customer table
  company_address?: string | null; // From customer table
  contact_email?: string | null; // From customer table
  contact_phone?: string | null; // From customer table
  contact_first_name?: string | null; // From customer table
}
