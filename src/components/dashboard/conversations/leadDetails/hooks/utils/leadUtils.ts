
import { Customer, Lead } from "../../../types";

/**
 * Calculate the number of days since a date string
 */
export function calculateDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
}

/**
 * Creates a fake lead object from customer data for display purposes
 */
export function createFakeLeadFromCustomer(
  customer: Customer,
  createdAt: string,
  userId: string
): Lead {
  return {
    id: `fake-${customer.id}`,
    created_at: createdAt,
    updated_at: createdAt,
    customer_id: customer.id,
    user_id: userId,
    pipeline_stage_id: '',
    value: 0,
    name: customer.name,
    contact_first_name: customer.name,
    company_name: customer.company_name
  };
}
