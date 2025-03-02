
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
    name: 'New Product Inquiry',
    created_at: createdAt,
    updated_at: createdAt,
    customer_id: customer.id,
    user_id: userId,
    company_name: null,
    company_address: null,
    contact_email: null,
    contact_phone: null,
    contact_first_name: null,
    value: null,
    pipeline_stage_id: null
  };
}

/**
 * Creates a mock lead and customer when no real data is available
 */
export function createMockLeadAndCustomer(userId: string): { 
  mockLead: Lead; 
  mockCustomer: Customer; 
  daysSinceCreation: number 
} {
  const mockCustomer: Customer = {
    id: '123',
    name: 'John Smith',
    phone_number: '+60192698338',
    email: 'john@example.com'
  };
  
  const createdAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  
  const mockLead: Lead = {
    id: '163674',
    name: 'New Product Inquiry',
    created_at: createdAt,
    updated_at: createdAt,
    customer_id: mockCustomer.id,
    user_id: userId,
    company_name: null,
    company_address: null,
    contact_email: null,
    contact_phone: null,
    contact_first_name: null,
    value: null,
    pipeline_stage_id: null
  };
  
  const daysSinceCreation = calculateDaysSinceCreation(mockLead.created_at);
  
  return { mockLead, mockCustomer, daysSinceCreation };
}

/**
 * Creates a mock lead from a conversation
 */
export function createMockLeadFromConversation(
  conversationData: { 
    customer_name?: string; 
    created_at: string; 
    updated_at?: string; 
  } | null, 
  userId: string
): { 
  mockLead: Lead; 
  mockCustomer: Customer; 
  daysSinceCreation: number 
} {
  if (!conversationData) {
    return createMockLeadAndCustomer(userId);
  }
  
  const mockCustomer: Customer = {
    id: `CUST-${Date.now().toString().slice(-6)}`,
    name: conversationData.customer_name || 'Unknown Customer',
    phone_number: '+60192698338',
    email: 'customer@example.com'
  };
  
  const mockLead: Lead = {
    id: `${Date.now().toString().slice(-6)}`,
    name: 'New Product Inquiry',
    created_at: conversationData.created_at,
    updated_at: conversationData.updated_at,
    customer_id: mockCustomer.id,
    user_id: userId,
    company_name: null,
    company_address: null,
    contact_email: null,
    contact_phone: null,
    contact_first_name: null,
    value: null,
    pipeline_stage_id: null
  };
  
  const daysSinceCreation = calculateDaysSinceCreation(mockLead.created_at);
  
  return { mockLead, mockCustomer, daysSinceCreation };
}
