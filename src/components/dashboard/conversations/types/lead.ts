
export interface Lead {
  id: string;
  name?: string | null; // Make name optional as it may not exist in the database
  created_at: string;
  updated_at?: string | undefined;
  pipeline_stage_id?: string | null;
  customer_id?: string | null;
  user_id: string;
  value?: number | null;
  company_name?: string | null;
  company_address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_first_name?: string | null;
}
