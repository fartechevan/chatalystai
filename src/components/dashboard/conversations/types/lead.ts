
export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  value: number;
  pipeline_stage_id: string;
  user_id: string;
  name?: string;
  contact_first_name?: string;
  company_name?: string;
}
