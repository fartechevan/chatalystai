
import { Customer, Lead } from "../../../types";

export function calculateDaysSinceCreation(createdAtStr: string): number {
  const createdAt = new Date(createdAtStr);
  const now = new Date();
  
  // Calculate time difference in milliseconds
  const timeDiff = now.getTime() - createdAt.getTime();
  
  // Convert to days
  return Math.floor(timeDiff / (1000 * 3600 * 24));
}

export function createFakeLeadFromCustomer(
  customer: Customer,
  createdAt: string,
  userId: string
): Lead {
  return {
    id: `fake-lead-${customer.id}`,
    created_at: createdAt,
    updated_at: createdAt,
    customer_id: customer.id,
    value: 0,
    pipeline_stage_id: '',
    user_id: userId,
    company_name: customer.company_name || undefined,
    contact_email: customer.email,
    contact_phone: customer.phone_number,
    company_address: customer.company_address,
    name: customer.name
  };
}
