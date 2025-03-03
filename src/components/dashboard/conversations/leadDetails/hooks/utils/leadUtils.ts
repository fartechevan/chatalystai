
import { Lead, Customer } from "../../../types";

/**
 * Calculates the number of days since a lead was created
 */
export function calculateDaysSinceCreation(createdAt: string): number {
  const date = new Date(createdAt);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Creates a fake lead from a customer
 */
export function createFakeLeadFromCustomer(customer: Customer, createdAt: string, userId: string): Lead {
  return {
    id: `${Date.now().toString().slice(-6)}`,
    created_at: createdAt,
    updated_at: createdAt,
    customer_id: customer.id,
    user_id: userId,
    value: null,
    pipeline_stage_id: null,
    
    // Virtual properties derived from customer
    name: 'New Product Inquiry',
    company_name: customer.company_name,
    company_address: customer.company_address,
    contact_email: customer.email,
    contact_phone: customer.phone_number,
    contact_first_name: customer.name
  };
}
