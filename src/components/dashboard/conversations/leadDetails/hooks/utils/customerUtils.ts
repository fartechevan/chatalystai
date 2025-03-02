
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "../../../types";

/**
 * Fetches a customer by ID from the database
 */
export async function fetchCustomerById(customerId: string): Promise<Customer | null> {
  if (!customerId) return null;
  
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error fetching customer:', customerError);
    return null;
  } 
  
  return customerData || null;
}
