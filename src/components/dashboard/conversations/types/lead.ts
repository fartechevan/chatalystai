
export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  value: number;
  pipeline_stage_id: string;
  user_id: string;
  
  // Virtual properties derived from customer data
  name?: string | undefined;
  contact_first_name?: string | undefined;
  company_name?: string | undefined;
  
  // Additional properties used in ConversationUserDetails
  contact_email?: string | undefined;
  contact_phone?: string | undefined;
  company_address?: string | undefined;
}
